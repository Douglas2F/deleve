from datetime import date, datetime, timedelta

from app.core.database import get_database


def save_sleep(bedtime: str, wake_time: str, sleep_date: str | None = None) -> dict:
    """Cria ou atualiza um registro de sono da semana atual."""
    bedtime_value = _parse_time(bedtime, "horário de dormir")
    wake_time_value = _parse_time(wake_time, "horário de acordar")
    wake_datetime = wake_time_value
    if wake_datetime <= bedtime_value:
        wake_datetime += timedelta(days=1)
    duration_minutes = int((wake_datetime - bedtime_value).total_seconds() // 60)
    if not 60 <= duration_minutes <= 960:
        raise ValueError("A duração do sono deve ficar entre 1 e 16 horas.")

    database = get_database()
    profile = database.execute(
        "SELECT id FROM health_profiles ORDER BY id DESC LIMIT 1"
    ).fetchone()
    if profile is None:
        raise ValueError("Configure seu perfil antes de registrar o sono.")

    selected_date = _parse_sleep_date(sleep_date)
    database.execute(
        """
        INSERT INTO health_sleep_entries
            (profile_id, sleep_date, bedtime, wake_time, duration_minutes)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(profile_id, sleep_date) DO UPDATE SET
            bedtime = excluded.bedtime,
            wake_time = excluded.wake_time,
            duration_minutes = excluded.duration_minutes,
            created_at = CURRENT_TIMESTAMP
        """,
        (profile["id"], selected_date.isoformat(), bedtime, wake_time, duration_minutes),
    )
    database.commit()
    return {
        "date": selected_date.isoformat(),
        "bedtime": bedtime,
        "wakeTime": wake_time,
        "durationMinutes": duration_minutes,
    }


def get_today_sleep() -> dict | None:
    database = get_database()
    row = database.execute(
        """
        SELECT bedtime, wake_time, duration_minutes
        FROM health_sleep_entries
        WHERE profile_id = (SELECT id FROM health_profiles ORDER BY id DESC LIMIT 1)
          AND sleep_date = ?
        """,
        (date.today().isoformat(),),
    ).fetchone()
    if row is None:
        return None
    return {
        "date": date.today().isoformat(),
        "bedtime": row["bedtime"],
        "wakeTime": row["wake_time"],
        "durationMinutes": row["duration_minutes"],
    }


def _parse_time(value: str, field_name: str) -> datetime:
    try:
        return datetime.strptime(str(value), "%H:%M")
    except (TypeError, ValueError) as error:
        raise ValueError(f"Informe um {field_name} válido.") from error


def get_weekly_sleep_summary(reference_date: date | None = None) -> dict:
    database = get_database()
    profile = database.execute(
        "SELECT id, sleep_goal_hours FROM health_profiles ORDER BY id DESC LIMIT 1"
    ).fetchone()
    if profile is None:
        return {"completedDays": 0, "goalDays": 0, "averageMinutes": 0, "goalMinutes": 0, "days": []}
    today = reference_date or date.today()
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)
    rows = database.execute(
        """
        SELECT sleep_date, bedtime, wake_time, duration_minutes
        FROM health_sleep_entries
        WHERE profile_id = ? AND sleep_date BETWEEN ? AND ?
        ORDER BY sleep_date
        """,
        (profile["id"], week_start.isoformat(), week_end.isoformat()),
    ).fetchall()
    entries = {row["sleep_date"]: row for row in rows}
    goal_minutes = int(float(profile["sleep_goal_hours"] or 0) * 60)
    days = []
    for offset in range(7):
        current = week_start + timedelta(days=offset)
        row = entries.get(current.isoformat())
        days.append(
            {
                "date": current.isoformat(),
                "isToday": current == today,
                "hasSleep": row is not None,
                "bedtime": row["bedtime"] if row else None,
                "wakeTime": row["wake_time"] if row else None,
                "durationMinutes": row["duration_minutes"] if row else None,
                "metGoal": bool(row and goal_minutes and row["duration_minutes"] >= goal_minutes),
            }
        )
    total_minutes = sum(row["duration_minutes"] for row in rows)
    return {
        "completedDays": len(rows),
        "goalDays": sum(row["duration_minutes"] >= goal_minutes for row in rows) if goal_minutes else 0,
        "averageMinutes": round(total_minutes / len(rows)) if rows else 0,
        "goalMinutes": goal_minutes,
        "days": days,
    }


def delete_sleep(sleep_date: str) -> bool:
    selected_date = _parse_sleep_date(sleep_date)
    database = get_database()
    profile = database.execute(
        "SELECT id FROM health_profiles ORDER BY id DESC LIMIT 1"
    ).fetchone()
    if profile is None:
        raise ValueError("Configure seu perfil antes de alterar o sono.")
    cursor = database.execute(
        "DELETE FROM health_sleep_entries WHERE profile_id = ? AND sleep_date = ?",
        (profile["id"], selected_date.isoformat()),
    )
    database.commit()
    return cursor.rowcount > 0


def _parse_sleep_date(value: str | None) -> date:
    if not value:
        selected = date.today()
    else:
        try:
            selected = date.fromisoformat(str(value))
        except ValueError as error:
            raise ValueError("Informe uma data de sono válida.") from error
    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    if selected > today:
        raise ValueError("Não é possível registrar sono em uma data futura.")
    if selected < week_start:
        raise ValueError("Nesta tela, registre apenas os dias da semana atual.")
    return selected
