from datetime import date, timedelta

from app.core.database import get_database


DEFAULT_GLASS_ML = 250


def set_water_portion(amount_ml):
    if type(amount_ml) is not int or not 50 <= amount_ml <= 2000:
        raise ValueError("Informe um tamanho inteiro entre 50 e 2.000 ml.")
    database = get_database()
    cursor = database.execute("UPDATE health_profiles SET water_portion_ml = ? WHERE id = (SELECT id FROM health_profiles ORDER BY id DESC LIMIT 1)", (amount_ml,))
    if cursor.rowcount != 1:
        database.rollback()
        raise ValueError("Configure seu perfil antes de escolher o tamanho do copo ou garrafa.")
    database.commit()


def add_water_entry(amount_ml: int | None = None, water_date: str | None = None) -> dict:
    """Registra água hoje ou em uma data anterior."""
    if amount_ml is not None:
        try:
            amount_ml = int(amount_ml)
        except (TypeError, ValueError) as error:
            raise ValueError("Informe uma quantidade de água válida.") from error
        if not 50 <= amount_ml <= 2000:
            raise ValueError("A quantidade deve ficar entre 50 e 2000 ml.")

    database = get_database()
    profile = database.execute("SELECT id, water_portion_ml FROM health_profiles ORDER BY id DESC LIMIT 1").fetchone()
    if profile is None:
        raise ValueError("Configure seu perfil antes de registrar água.")
    amount = profile["water_portion_ml"] if amount_ml is None else amount_ml

    selected_date = _parse_water_date(water_date)

    database.execute(
        """
        INSERT INTO health_water_entries (profile_id, amount_ml, recorded_at, created_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        """,
        (profile["id"], amount, f"{selected_date.isoformat()} 12:00:00"),
    )
    database.commit()
    return {
        "amountMl": amount,
        "waterDate": selected_date.isoformat(),
        "totalMl": get_water_total_for_date(selected_date, int(profile["id"])),
    }


def get_today_water_total(profile_id: int | None = None) -> int:
    """Soma os registros de água feitos hoje para o perfil atual."""
    return get_water_total_for_date(date.today(), profile_id)


def get_water_total_for_date(selected_date: date, profile_id: int | None = None) -> int:
    """Soma os registros de água de uma data para o perfil atual."""
    database = get_database()
    if profile_id is None:
        profile = database.execute(
            "SELECT id FROM health_profiles ORDER BY id DESC LIMIT 1"
        ).fetchone()
        if profile is None:
            return 0
        profile_id = int(profile["id"])

    row = database.execute(
        """
        SELECT COALESCE(SUM(amount_ml), 0) AS total_ml
        FROM health_water_entries
        WHERE profile_id = ?
          AND date(recorded_at, 'localtime') = ?
        """,
        (profile_id, selected_date.isoformat()),
    ).fetchone()
    return int(row["total_ml"])


def remove_latest_water_entry() -> dict:
    """Remove somente o registro de água mais recente feito hoje."""
    database = get_database()
    profile = database.execute(
        "SELECT id FROM health_profiles ORDER BY id DESC LIMIT 1"
    ).fetchone()
    if profile is None:
        raise ValueError("Configure seu perfil antes de alterar a água.")
    entry = database.execute(
        """
        SELECT id, amount_ml FROM health_water_entries
        WHERE profile_id = ?
          AND date(recorded_at, 'localtime') = date('now', 'localtime')
        ORDER BY recorded_at DESC, id DESC LIMIT 1
        """,
        (profile["id"],),
    ).fetchone()
    if entry is None:
        raise ValueError("Não há registro de água para desfazer hoje.")
    database.execute("DELETE FROM health_water_entries WHERE id = ?", (entry["id"],))
    database.commit()
    return {
        "removedAmountMl": int(entry["amount_ml"]),
        "totalMl": get_today_water_total(int(profile["id"])),
    }


def clear_water_day(water_date: str, expected_total: int) -> dict:
    selected = _parse_water_date(water_date)
    if not water_date or type(expected_total) is not int or expected_total < 0:
        raise ValueError("Confirme a data e o total de água que deseja zerar.")
    database = get_database()
    try:
        database.execute("BEGIN IMMEDIATE")
        profile = database.execute("SELECT id FROM health_profiles ORDER BY id DESC LIMIT 1").fetchone()
        if profile is None:
            raise ValueError("Configure seu perfil antes de alterar a água.")
        total = get_water_total_for_date(selected, profile["id"])
        if total != expected_total:
            raise ValueError("O total deste dia mudou. Selecione a data novamente antes de zerar.")
        database.execute("DELETE FROM health_water_entries WHERE profile_id = ? AND date(recorded_at, 'localtime') = ?", (profile["id"], selected.isoformat()))
        database.commit()
        return {"waterDate": selected.isoformat(), "removedAmountMl": total, "totalMl": 0}
    except Exception:
        database.rollback()
        raise


def delete_water_entry(entry_id: int) -> dict:
    database = get_database()
    try:
        database.execute("BEGIN IMMEDIATE")
        entry = database.execute("""
            SELECT id, profile_id, amount_ml, date(recorded_at, 'localtime') AS water_date
            FROM health_water_entries WHERE id = ?
            AND profile_id = (SELECT id FROM health_profiles ORDER BY id DESC LIMIT 1)
        """, (entry_id,)).fetchone()
        if entry is None:
            raise LookupError("Registro de água não encontrado.")
        selected = _parse_water_date(entry["water_date"])
        database.execute("DELETE FROM health_water_entries WHERE id = ? AND profile_id = ?", (entry_id, entry["profile_id"]))
        total = get_water_total_for_date(selected, entry["profile_id"])
        database.commit()
        return {"deleted": True, "id": entry_id, "waterDate": selected.isoformat(),
                "removedAmountMl": entry["amount_ml"], "totalMl": total}
    except Exception:
        database.rollback()
        raise


def get_water_week_for_date(value: str | None = None) -> dict:
    selected = _parse_water_date(value)
    end = selected + timedelta(days=6 - selected.weekday())
    return get_weekly_water_summary(min(end, date.today()))


def get_weekly_water_summary(reference_date: date | None = None) -> dict:
    """Calcula a média usando somente os dias decorridos da semana, incluindo hoje."""
    database = get_database()
    profile = database.execute(
        "SELECT id, water_goal_ml FROM health_profiles ORDER BY id DESC LIMIT 1"
    ).fetchone()
    if profile is None:
        return {"averageMl": 0, "totalMl": 0, "goalDays": 0, "elapsedDays": 0, "goalMl": 0, "days": []}
    today = reference_date or date.today()
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)
    elapsed_days = (today - week_start).days + 1
    rows = database.execute(
        """
        SELECT date(recorded_at, 'localtime') AS entry_date, SUM(amount_ml) AS total_ml
        FROM health_water_entries
        WHERE profile_id = ? AND date(recorded_at, 'localtime') BETWEEN ? AND ?
        GROUP BY date(recorded_at, 'localtime')
        """,
        (profile["id"], week_start.isoformat(), today.isoformat()),
    ).fetchall()
    totals = {row["entry_date"]: int(row["total_ml"]) for row in rows}
    entries = database.execute("""
        SELECT id, amount_ml, date(recorded_at, 'localtime') AS entry_date
        FROM health_water_entries
        WHERE profile_id = ? AND date(recorded_at, 'localtime') BETWEEN ? AND ?
        ORDER BY id
    """, (profile["id"], week_start.isoformat(), today.isoformat())).fetchall()
    goal_ml = int(profile["water_goal_ml"] or 0)
    days = []
    for offset in range(7):
        current = week_start + timedelta(days=offset)
        total_ml = totals.get(current.isoformat(), 0)
        days.append(
            {
                "date": current.isoformat(),
                "isToday": current == date.today(),
                "isFuture": current > today,
                "totalMl": total_ml,
                "entries": [{"id": entry["id"], "amountMl": entry["amount_ml"]}
                            for entry in entries if entry["entry_date"] == current.isoformat()],
                "metGoal": bool(goal_ml and total_ml >= goal_ml),
            }
        )
    total_ml = sum(totals.get((week_start + timedelta(days=offset)).isoformat(), 0) for offset in range(elapsed_days))
    return {
        "averageMl": round(total_ml / elapsed_days),
        "totalMl": total_ml,
        "goalDays": sum(day["metGoal"] for day in days if not day["isFuture"]),
        "elapsedDays": elapsed_days,
        "goalMl": goal_ml,
        "days": days,
    }


def _parse_water_date(value: str | None) -> date:
    today = date.today()
    if not value:
        return today
    try:
        selected_date = date.fromisoformat(str(value))
    except ValueError as error:
        raise ValueError("Informe uma data válida para o registro de água.") from error
    if selected_date > today:
        raise ValueError("Não é possível registrar água em uma data futura.")
    return selected_date
