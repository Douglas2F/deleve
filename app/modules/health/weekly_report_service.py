from datetime import date, timedelta

from app.core.database import get_database
from app.modules.health.exercise_service import get_weekly_exercise_summary


def get_weekly_health_report(reference_date: date | None = None) -> dict:
    """Reúne métricas da semana atual sem transformar dados em recomendações médicas."""
    database = get_database()
    profile = database.execute(
        """
        SELECT id, current_weight_kg, water_goal_ml, sleep_goal_hours
        FROM health_profiles ORDER BY id DESC LIMIT 1
        """
    ).fetchone()
    if profile is None:
        raise ValueError("Configure seu perfil antes de visualizar o relatório.")

    today = reference_date or date.today()
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)
    elapsed_days = (today - week_start).days + 1

    water_rows = database.execute(
        """
        SELECT date(recorded_at, 'localtime') AS entry_date, SUM(amount_ml) AS total_ml
        FROM health_water_entries
        WHERE profile_id = ? AND date(recorded_at, 'localtime') BETWEEN ? AND ?
        GROUP BY date(recorded_at, 'localtime')
        """,
        (profile["id"], week_start.isoformat(), today.isoformat()),
    ).fetchall()
    water_total = sum(row["total_ml"] for row in water_rows)
    water_goal = int(profile["water_goal_ml"] or 0)

    sleep_rows = database.execute(
        """
        SELECT sleep_date, duration_minutes FROM health_sleep_entries
        WHERE profile_id = ? AND sleep_date BETWEEN ? AND ?
        ORDER BY sleep_date
        """,
        (profile["id"], week_start.isoformat(), today.isoformat()),
    ).fetchall()
    sleep_goal_minutes = int(float(profile["sleep_goal_hours"] or 0) * 60)
    sleep_total = sum(row["duration_minutes"] for row in sleep_rows)

    exercise = get_weekly_exercise_summary(today)
    modalities = []
    for day in exercise["days"]:
        if day["hasExercise"] and day["type"] not in modalities:
            modalities.append(day["type"])

    weight_rows = database.execute(
        """
        SELECT recorded_on, weight_kg FROM health_weight_entries
        WHERE profile_id = ? AND recorded_on BETWEEN ? AND ?
        ORDER BY recorded_on, id
        """,
        (profile["id"], week_start.isoformat(), today.isoformat()),
    ).fetchall()
    current_weight = float(weight_rows[-1]["weight_kg"]) if weight_rows else float(profile["current_weight_kg"])
    weekly_weight_change = (
        round(float(weight_rows[-1]["weight_kg"]) - float(weight_rows[0]["weight_kg"]), 1)
        if len(weight_rows) > 1
        else 0.0
    )

    recorded_areas = sum(
        [water_total > 0, bool(sleep_rows), exercise["completedDays"] > 0, bool(weight_rows)]
    )
    return {
        "startDate": week_start.isoformat(),
        "endDate": week_end.isoformat(),
        "elapsedDays": elapsed_days,
        "recordedAreas": recorded_areas,
        "summary": _build_summary(recorded_areas),
        "water": {
            "totalMl": water_total,
            "averageMl": round(water_total / elapsed_days),
            "goalMl": water_goal,
            "goalDays": sum(row["total_ml"] >= water_goal for row in water_rows) if water_goal else 0,
        },
        "sleep": {
            "averageMinutes": round(sleep_total / len(sleep_rows)) if sleep_rows else 0,
            "recordedDays": len(sleep_rows),
            "goalMinutes": sleep_goal_minutes,
            "goalDays": sum(row["duration_minutes"] >= sleep_goal_minutes for row in sleep_rows) if sleep_goal_minutes else 0,
        },
        "exercise": {
            "completedDays": exercise["completedDays"],
            "targetDays": exercise["targetDays"],
            "totalMinutes": exercise["totalMinutes"],
            "modalities": modalities,
            "distanceByModality": exercise["distanceByModality"],
        },
        "weight": {
            "currentWeightKg": current_weight,
            "weeklyChangeKg": weekly_weight_change,
            "recordedDays": len(weight_rows),
        },
    }


def _build_summary(recorded_areas: int) -> str:
    if recorded_areas == 4:
        return "Você acompanhou todas as áreas de Saúde nesta semana. Continue no seu ritmo."
    if recorded_areas >= 2:
        return "Sua semana já tem bons registros. Cada informação ajuda a enxergar sua rotina com mais clareza."
    return "A semana está começando. Registre aos poucos, sem pressão."
