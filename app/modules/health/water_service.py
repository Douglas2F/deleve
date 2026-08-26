from datetime import date, timedelta

from app.core.database import get_database


DEFAULT_GLASS_ML = 250


def add_water_entry(amount_ml: int = DEFAULT_GLASS_ML, water_date: str | None = None) -> dict:
    """Registra água hoje ou em um dia já decorrido da semana atual."""
    try:
        amount = int(amount_ml)
    except (TypeError, ValueError) as error:
        raise ValueError("Informe uma quantidade de água válida.") from error

    if not 50 <= amount <= 2000:
        raise ValueError("A quantidade deve ficar entre 50 e 2000 ml.")

    database = get_database()
    profile = database.execute(
        "SELECT id FROM health_profiles ORDER BY id DESC LIMIT 1"
    ).fetchone()
    if profile is None:
        raise ValueError("Configure seu perfil antes de registrar água.")

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
        (profile["id"], week_start.isoformat(), week_end.isoformat()),
    ).fetchall()
    totals = {row["entry_date"]: int(row["total_ml"]) for row in rows}
    goal_ml = int(profile["water_goal_ml"] or 0)
    days = []
    for offset in range(7):
        current = week_start + timedelta(days=offset)
        total_ml = totals.get(current.isoformat(), 0)
        days.append(
            {
                "date": current.isoformat(),
                "isToday": current == today,
                "isFuture": current > today,
                "totalMl": total_ml,
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
    week_start = today - timedelta(days=today.weekday())
    if selected_date > today:
        raise ValueError("Não é possível registrar água em uma data futura.")
    if selected_date < week_start:
        raise ValueError("Escolha um dia da semana atual.")
    return selected_date
