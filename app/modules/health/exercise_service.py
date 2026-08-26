from datetime import date, timedelta

from app.core.database import get_database


EXERCISE_TYPES = {
    "Musculação",
    "Dança",
    "Corrida",
    "Ciclismo",
    "Futebol",
    "Outros",
}

DISTANCE_EXERCISE_TYPES = {"Corrida", "Ciclismo", "Futebol"}


def save_exercise(
    exercise_type: str,
    duration_minutes: int,
    note: str = "",
    exercise_date: str | None = None,
    custom_activity: str = "",
    distance_km: float | None = None,
) -> dict:
    """Cria ou atualiza um exercício desta semana, sem aceitar datas futuras."""
    normalized_type = str(exercise_type).strip().title()
    if normalized_type not in EXERCISE_TYPES:
        raise ValueError("Escolha um tipo de exercício válido.")
    stored_type = normalized_type
    if normalized_type == "Outros":
        stored_type = str(custom_activity or "").strip()
        if not 2 <= len(stored_type) <= 50:
            raise ValueError("Escreva a atividade usando entre 2 e 50 caracteres.")

    try:
        duration = int(duration_minutes)
    except (TypeError, ValueError) as error:
        raise ValueError("Informe a duração do exercício em minutos.") from error
    if not 1 <= duration <= 480:
        raise ValueError("A duração deve ficar entre 1 e 480 minutos.")

    distance = _parse_distance(distance_km, normalized_type)

    normalized_note = str(note or "").strip()
    if len(normalized_note) > 300:
        raise ValueError("A observação deve ter no máximo 300 caracteres.")

    database = get_database()
    profile = database.execute(
        "SELECT id FROM health_profiles ORDER BY id DESC LIMIT 1"
    ).fetchone()
    if profile is None:
        raise ValueError("Configure seu perfil antes de registrar um exercício.")

    selected_date = _parse_exercise_date(exercise_date)
    database.execute(
        """
        INSERT INTO health_exercise_entries
            (profile_id, exercise_date, exercise_type, duration_minutes, distance_km, note)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(profile_id, exercise_date) DO UPDATE SET
            exercise_type = excluded.exercise_type,
            duration_minutes = excluded.duration_minutes,
            distance_km = excluded.distance_km,
            note = excluded.note
        """,
        (
            profile["id"],
            selected_date.isoformat(),
            stored_type,
            duration,
            distance,
            normalized_note or None,
        ),
    )
    database.commit()
    return {
        "date": selected_date.isoformat(),
        "type": stored_type,
        "durationMinutes": duration,
        "distanceKm": distance,
        "note": normalized_note,
        **_calculate_performance(stored_type, duration, distance),
    }


def get_today_exercise() -> dict | None:
    database = get_database()
    row = database.execute(
        """
        SELECT exercise_type, duration_minutes, distance_km, note
        FROM health_exercise_entries
        WHERE profile_id = (SELECT id FROM health_profiles ORDER BY id DESC LIMIT 1)
          AND exercise_date = ?
        """,
        (date.today().isoformat(),),
    ).fetchone()
    if row is None:
        return None
    return {
        "date": date.today().isoformat(),
        "type": row["exercise_type"],
        "durationMinutes": row["duration_minutes"],
        "distanceKm": row["distance_km"],
        "note": row["note"] or "",
        **_calculate_performance(
            row["exercise_type"], row["duration_minutes"], row["distance_km"]
        ),
    }


def get_weekly_exercise_summary(reference_date: date | None = None) -> dict:
    """Devolve uma semana estruturada para o calendário e futuros relatórios."""
    database = get_database()
    profile = database.execute(
        "SELECT id FROM health_profiles ORDER BY id DESC LIMIT 1"
    ).fetchone()
    if profile is None:
        return {"startDate": None, "endDate": None, "completedDays": 0, "targetDays": 0, "totalMinutes": 0, "distanceByModality": [], "days": []}

    current_date = reference_date or date.today()
    start_date = current_date - timedelta(days=current_date.weekday())
    end_date = start_date + timedelta(days=6)
    rows = database.execute(
        """
        SELECT exercise_date, exercise_type, duration_minutes, distance_km, note
        FROM health_exercise_entries
        WHERE profile_id = ? AND exercise_date BETWEEN ? AND ?
        ORDER BY exercise_date
        """,
        (profile["id"], start_date.isoformat(), end_date.isoformat()),
    ).fetchall()
    entries = {row["exercise_date"]: row for row in rows}
    goal = database.execute(
        """
        SELECT target_value FROM health_goals
        WHERE profile_id = ? AND goal_type = 'Praticar atividade física'
        ORDER BY id DESC LIMIT 1
        """,
        (profile["id"],),
    ).fetchone()
    target_days = int(goal["target_value"]) if goal and goal["target_value"] else 0
    days = []
    for offset in range(7):
        day = start_date + timedelta(days=offset)
        row = entries.get(day.isoformat())
        day_entry = {
                "date": day.isoformat(),
                "isToday": day == current_date,
                "hasExercise": row is not None,
                "type": row["exercise_type"] if row else None,
                "durationMinutes": row["duration_minutes"] if row else None,
                "distanceKm": row["distance_km"] if row else None,
                "note": (row["note"] or "") if row else "",
            }
        if row:
            day_entry.update(
                _calculate_performance(
                    row["exercise_type"], row["duration_minutes"], row["distance_km"]
                )
            )
        else:
            day_entry.update({"paceSecondsPerKm": None, "averageSpeedKmh": None})
        days.append(day_entry)
    distance_totals: dict[str, dict[str, float | int]] = {}
    for row in rows:
        if row["distance_km"] is not None:
            total = distance_totals.setdefault(
                row["exercise_type"], {"totalKm": 0.0, "totalMinutes": 0}
            )
            total["totalKm"] = round(float(total["totalKm"]) + float(row["distance_km"]), 2)
            total["totalMinutes"] = int(total["totalMinutes"]) + int(row["duration_minutes"])
    return {
        "startDate": start_date.isoformat(),
        "endDate": end_date.isoformat(),
        "completedDays": len(rows),
        "targetDays": target_days,
        "totalMinutes": sum(row["duration_minutes"] for row in rows),
        "distanceByModality": [
            {
                "type": exercise_type,
                "totalKm": totals["totalKm"],
                "totalMinutes": totals["totalMinutes"],
                **_calculate_performance(
                    exercise_type,
                    int(totals["totalMinutes"]),
                    float(totals["totalKm"]),
                ),
            }
            for exercise_type, totals in distance_totals.items()
        ],
        "days": days,
    }


def delete_exercise(exercise_date: str) -> bool:
    """Exclui um registro da semana atual e informa se ele existia."""
    selected_date = _parse_exercise_date(exercise_date)
    database = get_database()
    profile = database.execute(
        "SELECT id FROM health_profiles ORDER BY id DESC LIMIT 1"
    ).fetchone()
    if profile is None:
        raise ValueError("Configure seu perfil antes de alterar exercícios.")
    cursor = database.execute(
        "DELETE FROM health_exercise_entries WHERE profile_id = ? AND exercise_date = ?",
        (profile["id"], selected_date.isoformat()),
    )
    database.commit()
    return cursor.rowcount > 0


def _parse_exercise_date(value: str | None) -> date:
    if not value:
        selected_date = date.today()
    else:
        try:
            selected_date = date.fromisoformat(str(value))
        except ValueError as error:
            raise ValueError("Informe uma data de exercício válida.") from error

    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    if selected_date > today:
        raise ValueError("Não é possível registrar exercício em uma data futura.")
    if selected_date < week_start:
        raise ValueError("Nesta tela, registre apenas os dias da semana atual.")
    return selected_date


def _parse_distance(value: float | None, exercise_type: str) -> float | None:
    if value in (None, ""):
        return None
    if exercise_type not in DISTANCE_EXERCISE_TYPES:
        raise ValueError("A distância está disponível para corrida, ciclismo e futebol.")
    try:
        distance = float(str(value).replace(",", "."))
    except (TypeError, ValueError) as error:
        raise ValueError("Informe uma distância válida em quilômetros.") from error
    if not 0.1 <= distance <= 1000:
        raise ValueError("A distância deve ficar entre 0,1 e 1.000 km.")
    return round(distance, 2)


def _calculate_performance(
    exercise_type: str, duration_minutes: int, distance_km: float | None
) -> dict:
    """Calcula métricas derivadas sem persistir valores redundantes no banco."""
    if not distance_km:
        return {"paceSecondsPerKm": None, "averageSpeedKmh": None}
    if exercise_type == "Corrida":
        return {
            "paceSecondsPerKm": round(duration_minutes * 60 / float(distance_km)),
            "averageSpeedKmh": None,
        }
    if exercise_type == "Ciclismo":
        return {
            "paceSecondsPerKm": None,
            "averageSpeedKmh": round(float(distance_km) / (duration_minutes / 60), 1),
        }
    return {"paceSecondsPerKm": None, "averageSpeedKmh": None}
