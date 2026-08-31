from datetime import date, datetime, timedelta, timezone

import json
from app.core.database import get_database
from app.modules.health.calorie_estimation import EFFORTS, estimate_active_calories


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
    calories_burned: int | None = None,
    entry_id: int | None = None,
    calorie_source: str | None = None,
    effort: str | None = None,
    duration_seconds: int | None = None,
) -> dict:
    """Adiciona uma atividade; edição requer seu ID explícito."""
    normalized_type = str(exercise_type).strip().title()
    if normalized_type not in EXERCISE_TYPES:
        raise ValueError("Escolha um tipo de exercício válido.")
    stored_type = normalized_type
    if normalized_type == "Outros":
        stored_type = str(custom_activity or "").strip()
        if not 2 <= len(stored_type) <= 50:
            raise ValueError("Escreva a atividade usando entre 2 e 50 caracteres.")

    duration = _parse_duration_seconds(duration_minutes, duration_seconds)

    distance = _parse_distance(distance_km, normalized_type)
    effort = _parse_effort(effort)
    source = calorie_source or ("manual" if calories_burned not in (None, "") else "none")
    if source not in ("estimated", "manual", "none"):
        raise ValueError("Origem das calorias inválida.")
    calories = _parse_calories(calories_burned) if source == "manual" else None

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
    existing = None
    if entry_id is not None:
        existing = database.execute(
            "SELECT * FROM health_exercise_entries WHERE id = ? AND profile_id = ?",
            (entry_id, profile["id"]),
        ).fetchone()
        if existing is None:
            raise LookupError("Atividade não encontrada.")
        _parse_exercise_date(existing["exercise_date"])
        if not exercise_date:
            selected_date = date.fromisoformat(existing["exercise_date"])
    estimate = None
    if source == "estimated":
        estimate = _estimate_for_profile(profile["id"], normalized_type, duration, distance, selected_date, existing, effort)
        calories = estimate["calories"] if estimate else None
    if calories is None:
        source = "none"
    # Keep the old positive whole-minute column for legacy database consumers.
    # The seconds column is authoritative; API minutes retain the exact fraction.
    legacy_minutes = (duration + 59) // 60
    values = (selected_date.isoformat(), stored_type, legacy_minutes, distance, calories, normalized_note or None,
              datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S.%f"))
    if entry_id is None:
        cursor = database.execute("""
            INSERT INTO health_exercise_entries
                (exercise_date, exercise_type, duration_minutes, distance_km, calories_burned, note, created_at, profile_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (*values, profile["id"]))
        entry_id = cursor.lastrowid
    else:
        database.execute("""
            UPDATE health_exercise_entries SET exercise_date = ?, exercise_type = ?,
                duration_minutes = ?, distance_km = ?, calories_burned = ?, note = ?,
                created_at = ?
            WHERE id = ? AND profile_id = ?
        """, (*values, entry_id, profile["id"]))
    database.execute("UPDATE health_exercise_entries SET calorie_source = ?, calorie_estimate = ?, effort = ?, duration_seconds = ? WHERE id = ?",
                     (source, json.dumps(estimate) if estimate else None, effort, duration, entry_id))
    database.commit()
    return _serialize_entry(database.execute(
        "SELECT * FROM health_exercise_entries WHERE id = ?", (entry_id,)
    ).fetchone())


def _serialize_entry(row) -> dict:
    seconds = _row_duration_seconds(row)
    return {
        "id": row["id"], "date": row["exercise_date"], "type": row["exercise_type"],
        "durationSeconds": seconds, "durationMinutes": seconds / 60, "distanceKm": row["distance_km"],
        "caloriesBurned": row["calories_burned"], "note": row["note"] or "",
        "recordedAt": row["created_at"],
        "calorieSource": row["calorie_source"] or ("manual" if row["calories_burned"] is not None else "none"),
        "calorieEstimate": json.loads(row["calorie_estimate"]) if row["calorie_estimate"] else None,
        "effort": row["effort"],
        **_calculate_performance(row["exercise_type"], seconds, row["distance_km"]),
    }


def get_today_exercises() -> list[dict]:
    rows = get_database().execute("""
        SELECT * FROM health_exercise_entries
        WHERE profile_id = (SELECT id FROM health_profiles ORDER BY id DESC LIMIT 1)
          AND exercise_date = ?
        ORDER BY created_at DESC, id DESC
    """, (date.today().isoformat(),)).fetchall()
    return [_serialize_entry(row) for row in rows]


def get_today_exercise() -> dict | None:
    entries = get_today_exercises()
    return entries[0] if entries else None


def summarize_exercises(entries: list[dict]) -> dict:
    modalities = {}
    for entry in entries:
        item = modalities.setdefault(entry["type"], {
            "type": entry["type"], "activityCount": 0, "totalSeconds": 0,
            "totalCalories": 0, "totalKm": None, "distanceSeconds": 0,
        })
        item["activityCount"] += 1
        item["totalSeconds"] += entry["durationSeconds"]
        item["totalCalories"] += entry["caloriesBurned"] or 0
        if entry["distanceKm"] is not None:
            item["totalKm"] = round((item["totalKm"] or 0) + entry["distanceKm"], 2)
            item["distanceSeconds"] += entry["durationSeconds"]
    by_modality = []
    for item in modalities.values():
        distance_seconds = item.pop("distanceSeconds")
        item["totalMinutes"] = item["totalSeconds"] / 60
        item.update(_calculate_performance(item["type"], distance_seconds, item["totalKm"]))
        by_modality.append(item)
    return {
        "activityCount": len(entries),
        "totalSeconds": sum(entry["durationSeconds"] for entry in entries),
        "totalMinutes": sum(entry["durationSeconds"] for entry in entries) / 60,
        "totalCalories": sum(entry["caloriesBurned"] or 0 for entry in entries),
        "byModality": by_modality,
        **calorie_totals(entries),
    }



def calorie_totals(entries: list[dict]) -> dict:
    estimated = sum(e["caloriesBurned"] or 0 for e in entries if e.get("calorieSource") == "estimated")
    manual = sum(e["caloriesBurned"] or 0 for e in entries if e.get("calorieSource") != "estimated")
    return {
        "estimatedCalories": estimated, "manualCalories": manual,
        "calorieSource": "mixed" if estimated and manual else "estimated" if estimated else "manual" if manual else "none",
    }


def _parse_effort(value):
    if value in (None, ""):
        return None
    if not isinstance(value, str) or value not in EFFORTS:
        raise ValueError("Escolha um esforço válido.")
    return value


def _row_duration_seconds(row):
    return row["duration_seconds"] if row["duration_seconds"] is not None else row["duration_minutes"] * 60


def _parse_duration_seconds(minutes, seconds=None):
    # A seconds payload takes precedence over the legacy whole-minute payload.
    value = seconds if seconds is not None else minutes
    try:
        if isinstance(value, bool):
            raise ValueError()
        whole = int(str(value).strip())
    except (TypeError, ValueError, OverflowError) as error:
        raise ValueError("Informe uma duração válida, sem frações de segundo.") from error
    total = whole if seconds is not None else whole * 60
    if not 1 <= total <= 28800:
        if seconds is None:
            raise ValueError("A duração deve ficar entre 1 e 480 minutos.")
        raise ValueError("A duração deve ficar entre 1 segundo e 8 horas.")
    return total


def _estimate_for_profile(profile_id, kind, duration, distance, selected_date, existing=None, effort=None):
    if (existing is not None and existing["calorie_source"] == "estimated"
            and existing["calorie_estimate"] and existing["exercise_type"] == kind
            and _row_duration_seconds(existing) == duration and existing["distance_km"] == distance
            and existing["exercise_date"] == selected_date.isoformat()
            and existing["effort"] == effort):
        return json.loads(existing["calorie_estimate"])
    database = get_database()
    weight = database.execute("""
        SELECT weight_kg FROM health_weight_entries WHERE profile_id = ? AND recorded_on <= ?
        ORDER BY recorded_on DESC, id DESC LIMIT 1
    """, (profile_id, selected_date.isoformat())).fetchone()
    if weight is None:
        weight = database.execute("SELECT current_weight_kg FROM health_profiles WHERE id = ?", (profile_id,)).fetchone()
    if weight is None:
        return None
    estimate = estimate_active_calories(kind, duration / 60, distance, float(weight[0]), effort)
    if estimate:
        estimate["date"] = selected_date.isoformat()
        estimate["durationSeconds"] = duration
    return estimate


def preview_exercise_calories(data: dict) -> dict:
    effort = _parse_effort(data.get("effort"))
    kind = str(data.get("type", "")).strip().title()
    if kind not in EXERCISE_TYPES:
        raise ValueError("Escolha um tipo de exercício válido.")
    duration = _parse_duration_seconds(data.get("durationMinutes"), data.get("durationSeconds"))
    distance = _parse_distance(data.get("distanceKm"), kind)
    selected_date = _parse_exercise_date(data.get("exerciseDate"))
    database = get_database()
    profile = database.execute("SELECT id FROM health_profiles ORDER BY id DESC LIMIT 1").fetchone()
    if profile is None:
        raise ValueError("Configure seu perfil antes de estimar calorias.")
    existing = None
    if data.get("entryId") is not None:
        existing = database.execute(
            "SELECT * FROM health_exercise_entries WHERE id = ? AND profile_id = ?",
            (data["entryId"], profile["id"]),
        ).fetchone()
        if existing is None:
            raise ValueError("Atividade não encontrada.")
    return {"estimate": _estimate_for_profile(profile["id"], kind, duration, distance, selected_date, existing, effort)}


def get_exercise_week_for_date(value: str | None = None) -> dict:
    """Returns the whole selected week, capped at today, for the activity calendar."""
    selected = _parse_exercise_date(value)
    end = selected + timedelta(days=6 - selected.weekday())
    return get_weekly_exercise_summary(min(end, date.today()))


def get_weekly_exercise_summary(reference_date: date | None = None) -> dict:
    database = get_database()
    current_date = reference_date or date.today()
    start_date = current_date - timedelta(days=current_date.weekday())
    end_date = start_date + timedelta(days=6)
    profile = database.execute("SELECT id FROM health_profiles ORDER BY id DESC LIMIT 1").fetchone()
    profile_id = profile["id"] if profile else None
    rows = database.execute("""
        SELECT * FROM health_exercise_entries
        WHERE profile_id = ? AND exercise_date BETWEEN ? AND ?
        ORDER BY exercise_date, created_at, id
    """, (profile_id, start_date.isoformat(), current_date.isoformat())).fetchall()
    entries = [_serialize_entry(row) for row in rows]
    goal = database.execute("""
        SELECT target_value FROM health_goals
        WHERE profile_id = ? AND goal_type = 'Praticar atividade física'
        ORDER BY id DESC LIMIT 1
    """, (profile_id,)).fetchone()
    days = []
    for offset in range(7):
        day = start_date + timedelta(days=offset)
        day_entries = [entry for entry in entries if entry["date"] == day.isoformat()]
        single = day_entries[0] if len(day_entries) == 1 else None
        summary = summarize_exercises(day_entries)
        days.append({
            "date": day.isoformat(), "isToday": day == date.today(),
            "hasExercise": bool(day_entries), "entries": day_entries, **summary,
            # Compatibility fields are meaningful only for a single activity.
            "type": single["type"] if single else None,
            "durationMinutes": summary["totalMinutes"] if day_entries else None,
            "durationSeconds": summary["totalSeconds"] if day_entries else None,
            "distanceKm": single["distanceKm"] if single else None,
            "caloriesBurned": single["caloriesBurned"] if single else None,
            "paceSecondsPerKm": single["paceSecondsPerKm"] if single else None,
            "averageSpeedKmh": single["averageSpeedKmh"] if single else None,
            "note": single["note"] if single else "",
        })
    summary = summarize_exercises(entries)
    return {
        "startDate": start_date.isoformat(), "endDate": end_date.isoformat(),
        "completedDays": sum(day["hasExercise"] for day in days),
        "targetDays": int(goal["target_value"]) if goal and goal["target_value"] else 0,
        **summary,
        "distanceByModality": [item for item in summary["byModality"] if item["totalKm"] is not None],
        "days": days,
    }


def delete_exercise_by_id(entry_id: int) -> bool:
    database = get_database()
    row = database.execute("""
        SELECT exercise_date FROM health_exercise_entries
        WHERE id = ? AND profile_id = (SELECT id FROM health_profiles ORDER BY id DESC LIMIT 1)
    """, (entry_id,)).fetchone()
    if row is None:
        return False
    _parse_exercise_date(row["exercise_date"])
    database.execute("DELETE FROM health_exercise_entries WHERE id = ?", (entry_id,))
    database.commit()
    return True


def delete_exercise(exercise_date: str) -> bool:
    """Compatibilidade: nunca apaga várias atividades usando apenas a data."""
    selected_date = _parse_exercise_date(exercise_date)
    rows = get_database().execute("""
        SELECT id FROM health_exercise_entries
        WHERE profile_id = (SELECT id FROM health_profiles ORDER BY id DESC LIMIT 1)
          AND exercise_date = ?
    """, (selected_date.isoformat(),)).fetchall()
    if len(rows) > 1:
        raise ValueError("Escolha a atividade que deseja excluir.")
    return delete_exercise_by_id(rows[0]["id"]) if rows else False


def _parse_exercise_date(value: str | None) -> date:
    if not value:
        selected_date = date.today()
    else:
        try:
            selected_date = date.fromisoformat(str(value))
        except ValueError as error:
            raise ValueError("Informe uma data de exercício válida.") from error

    today = date.today()
    if selected_date > today:
        raise ValueError("Não é possível registrar exercício em uma data futura.")
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


def _parse_calories(value: int | None) -> int | None:
    if value in (None, ""):
        return None
    try:
        calories = int(value)
    except (TypeError, ValueError) as error:
        raise ValueError("Informe uma quantidade válida de calorias.") from error
    if not 1 <= calories <= 10000:
        raise ValueError("As calorias devem ficar entre 1 e 10.000 kcal.")
    return calories


def _calculate_performance(
    exercise_type: str, duration_seconds: int, distance_km: float | None
) -> dict:
    """Calcula métricas derivadas sem persistir valores redundantes no banco."""
    if not distance_km:
        return {"paceSecondsPerKm": None, "averageSpeedKmh": None}
    if exercise_type == "Corrida":
        return {
            "paceSecondsPerKm": int(duration_seconds / float(distance_km) + 0.5),
            "averageSpeedKmh": None,
        }
    if exercise_type == "Ciclismo":
        return {
            "paceSecondsPerKm": None,
            "averageSpeedKmh": round(float(distance_km) / (duration_seconds / 3600), 1),
        }
    return {"paceSecondsPerKm": None, "averageSpeedKmh": None}
