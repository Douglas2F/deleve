from datetime import date, timedelta

from app.core.database import get_database
from app.modules.health.exercise_service import get_weekly_exercise_summary


def get_weekly_health_report(reference_date: date | None = None, week_offset: int = 0) -> dict:
    report = _get_week_report(reference_date, week_offset)
    try:
        previous_cutoff = date.fromisoformat(report["referenceDate"]) - timedelta(days=7)
    except OverflowError:
        report["previousComparison"] = None
        return report
    # Reuse the same aggregation and current goals, ending on the same weekday.
    previous = _get_week_report(previous_cutoff)
    comparison = {
        "startDate": previous["startDate"],
        "endDate": previous["referenceDate"],
    }
    for area, metric, goal in [("water", "goalDays", "goalMl"),
                               ("sleep", "goalDays", "goalMinutes"),
                               ("exercise", "completedDays", None)]:
        current, prior = report[area], previous[area]
        records = "completedDays" if area == "exercise" else "recordedDays"
        available = bool(current[records] and prior[records] and (goal is None or current[goal] > 0))
        comparison[area] = {
            "available": available,
            "current": current[metric], "previous": prior[metric],
            "difference": current[metric] - prior[metric] if available else None,
        }
    current, prior = report["weight"], previous["weight"]
    available = bool(current["latestDate"] and prior["latestDate"])
    comparison["weight"] = {
        "available": available,
        "difference": round(current["currentWeightKg"] - prior["currentWeightKg"], 1) if available else None,
        "currentDate": current["latestDate"], "previousDate": prior["latestDate"],
        "goalDirection": current["goalDirection"],
    }
    report["previousComparison"] = comparison
    return report


def _get_week_report(reference_date: date | None = None, week_offset: int = 0) -> dict:
    """Consulta uma semana sem alterar registros; a semana atual termina em hoje."""
    if type(week_offset) is not int or week_offset > 0:
        raise ValueError("Escolha a semana atual ou uma semana anterior.")
    today = reference_date or date.today()
    try:
        week_start = today - timedelta(days=today.weekday()) + timedelta(weeks=week_offset)
        week_end = week_start + timedelta(days=6)
    except OverflowError as error:
        raise ValueError("Semana fora do intervalo de datas permitido.") from error
    cutoff = min(today, week_end)
    elapsed_days = (cutoff - week_start).days + 1
    database = get_database()
    profile = database.execute(
        """
        SELECT id, current_weight_kg, water_goal_ml, sleep_goal_hours, goal
        FROM health_profiles ORDER BY id DESC LIMIT 1
        """
    ).fetchone()
    if profile is None:
        raise ValueError("Configure seu perfil antes de visualizar o relatório.")

    water_rows = database.execute(
        """
        SELECT date(recorded_at, 'localtime') AS entry_date, SUM(amount_ml) AS total_ml
        FROM health_water_entries
        WHERE profile_id = ? AND date(recorded_at, 'localtime') BETWEEN ? AND ?
        GROUP BY date(recorded_at, 'localtime')
        """,
        (profile["id"], week_start.isoformat(), cutoff.isoformat()),
    ).fetchall()
    water_total = sum(row["total_ml"] for row in water_rows)
    water_goal = int(profile["water_goal_ml"] or 0)

    sleep_rows = database.execute(
        """
        SELECT sleep_date, duration_minutes FROM health_sleep_entries
        WHERE profile_id = ? AND sleep_date BETWEEN ? AND ?
        ORDER BY sleep_date
        """,
        (profile["id"], week_start.isoformat(), cutoff.isoformat()),
    ).fetchall()
    sleep_goal_minutes = int(float(profile["sleep_goal_hours"] or 0) * 60)
    sleep_total = sum(row["duration_minutes"] for row in sleep_rows)
    water_by_date = {row["entry_date"]: row["total_ml"] for row in water_rows}
    sleep_by_date = {row["sleep_date"]: row["duration_minutes"] for row in sleep_rows}

    def daily_values(values: dict, goal: int) -> list[dict]:
        days = []
        for offset in range(7):
            day = week_start + timedelta(days=offset)
            value = values.get(day.isoformat())
            days.append({
                "date": day.isoformat(),
                "value": value,
                "isFuture": day > today,
                "goalReached": bool(goal and value is not None and value >= goal),
            })
        return days

    exercise = get_weekly_exercise_summary(cutoff)
    modalities = []
    for item in exercise["byModality"]:
        modalities.append(item["type"])

    weight_rows = database.execute(
        """
        SELECT recorded_on, weight_kg FROM health_weight_entries
        WHERE profile_id = ? AND recorded_on BETWEEN ? AND ?
        ORDER BY recorded_on, id
        """,
        (profile["id"], week_start.isoformat(), cutoff.isoformat()),
    ).fetchall()
    # Never present today's profile weight as a measurement from a past week.
    current_weight = float(weight_rows[-1]["weight_kg"]) if weight_rows else (
        float(profile["current_weight_kg"]) if week_offset == 0 else None
    )
    weekly_weight_change = (
        round(float(weight_rows[-1]["weight_kg"]) - float(weight_rows[0]["weight_kg"]), 1)
        if len(weight_rows) > 1
        else 0.0
    )

    recorded_areas = sum(
        [water_total > 0, bool(sleep_rows), exercise["completedDays"] > 0, bool(weight_rows)]
    )
    goals = {item.strip() for item in (profile["goal"] or "").split(",")}
    losing, gaining = "Perder peso" in goals, "Ganhar peso" in goals
    weight_direction = (-1 if losing else 1) if losing != gaining and "Manter peso" not in goals else 0
    return {
        "startDate": week_start.isoformat(),
        "endDate": week_end.isoformat(),
        "referenceDate": cutoff.isoformat(),
        "weekOffset": week_offset,
        "isCurrentWeek": week_offset == 0,
        "elapsedDays": elapsed_days,
        "recordedAreas": recorded_areas,
        "summary": _build_summary(recorded_areas),
        "water": {
            "totalMl": water_total,
            "averageMl": round(water_total / elapsed_days),
            "goalMl": water_goal,
            "goalDays": sum(row["total_ml"] >= water_goal for row in water_rows) if water_goal else 0,
            "recordedDays": len(water_rows),
            "days": daily_values(water_by_date, water_goal),
        },
        "sleep": {
            "averageMinutes": round(sleep_total / len(sleep_rows)) if sleep_rows else 0,
            "recordedDays": len(sleep_rows),
            "goalMinutes": sleep_goal_minutes,
            "goalDays": sum(row["duration_minutes"] >= sleep_goal_minutes for row in sleep_rows) if sleep_goal_minutes else 0,
            "days": daily_values(sleep_by_date, sleep_goal_minutes),
        },
        "exercise": {
            "completedDays": exercise["completedDays"],
            "activityCount": exercise["activityCount"],
            "byModality": exercise["byModality"],
            "targetDays": exercise["targetDays"],
            "totalMinutes": exercise["totalMinutes"],
            "totalSeconds": exercise["totalSeconds"],
            "totalCalories": exercise["totalCalories"],
            "calorieSource": exercise["calorieSource"],
            "estimatedCalories": exercise["estimatedCalories"],
            "manualCalories": exercise["manualCalories"],
            "modalities": modalities,
            "distanceByModality": exercise["distanceByModality"],
            "days": [{
                "date": day["date"],
                "isFuture": day["date"] > today.isoformat(),
                "activityCount": day["activityCount"],
                "totalSeconds": day["totalSeconds"],
                "totalMinutes": day["totalMinutes"],
                "entries": day["entries"],
            } for day in exercise["days"]],
        },
        "weight": {
            "goalDirection": weight_direction,
            "currentWeightKg": current_weight,
            "weeklyChangeKg": weekly_weight_change,
            "recordedDays": len(weight_rows),
            "comparisonAvailable": len(weight_rows) > 1,
            "initialWeightKg": float(weight_rows[0]["weight_kg"]) if weight_rows else None,
            "initialDate": weight_rows[0]["recorded_on"] if weight_rows else None,
            "latestDate": weight_rows[-1]["recorded_on"] if weight_rows else None,
        },
    }


def _build_summary(recorded_areas: int) -> str:
    if recorded_areas == 4:
        return "Você acompanhou todas as áreas de Saúde nesta semana. Continue no seu ritmo."
    if recorded_areas >= 2:
        return "Sua semana já tem bons registros. Cada informação ajuda a enxergar sua rotina com mais clareza."
    return "Cada registro ajuda a conhecer sua rotina. Faça no seu tempo, sem pressão."
