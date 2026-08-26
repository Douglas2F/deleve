from flask import Blueprint, jsonify, render_template, request
from app.modules.health.exercise_service import (
    delete_exercise,
    get_today_exercise,
    get_weekly_exercise_summary,
    save_exercise,
)
from app.modules.health.services import create_profile, get_latest_profile, update_latest_profile
from app.modules.health.sleep_service import (
    delete_sleep,
    get_today_sleep,
    get_weekly_sleep_summary,
    save_sleep,
)
from app.modules.health.water_service import (
    add_water_entry,
    get_weekly_water_summary,
    get_today_water_total,
    remove_latest_water_entry,
)
from app.modules.health.weight_service import get_weight_summary, save_today_weight
from app.modules.health.weekly_report_service import get_weekly_health_report
from app.modules.health.latest_activity_service import get_latest_health_activity
from app.modules.health.daily_focus_service import delete_today_focus, get_today_focus, save_today_focus, set_today_focus_completed


health_blueprint = Blueprint("health", __name__)


@health_blueprint.get("/")
def dashboard():
    """Apresenta a página inicial do primeiro módulo do projeto."""
    return render_template("health/dashboard.html")

@health_blueprint.post("/api/health/profile")
def save_health_profile():
    try: profile_id = create_profile(request.get_json(silent=True) or {})
    except (TypeError, ValueError) as error: return jsonify({"error": str(error)}), 400
    return jsonify({"id": profile_id, "message": "Perfil criado com sucesso."}), 201

@health_blueprint.get("/api/health/profile")
def read_health_profile():
    profile = get_latest_profile()
    return (jsonify(profile), 200) if profile else (jsonify({"profile": None}), 404)


@health_blueprint.put("/api/health/profile")
def update_health_profile():
    try:
        return jsonify(update_latest_profile(request.get_json(silent=True) or {}))
    except (TypeError, ValueError) as error:
        return jsonify({"error": str(error)}), 400


@health_blueprint.get("/api/health/water/today")
def read_today_water():
    return jsonify({"totalMl": get_today_water_total()})


@health_blueprint.post("/api/health/water")
def save_water_entry():
    data = request.get_json(silent=True) or {}
    try:
        result = add_water_entry(data.get("amountMl", 250), data.get("waterDate"))
    except ValueError as error:
        return jsonify({"error": str(error)}), 400
    return jsonify(result), 201


@health_blueprint.delete("/api/health/water/latest")
def remove_water_entry():
    try:
        return jsonify(remove_latest_water_entry())
    except ValueError as error:
        return jsonify({"error": str(error)}), 400


@health_blueprint.get("/api/health/water/week")
def read_weekly_water():
    return jsonify(get_weekly_water_summary())


@health_blueprint.get("/api/health/sleep/today")
def read_today_sleep():
    return jsonify({"entry": get_today_sleep()})


@health_blueprint.post("/api/health/sleep")
def save_sleep_entry():
    data = request.get_json(silent=True) or {}
    try:
        result = save_sleep(data.get("bedtime", ""), data.get("wakeTime", ""), data.get("sleepDate"))
    except ValueError as error:
        return jsonify({"error": str(error)}), 400
    return jsonify(result), 201


@health_blueprint.get("/api/health/sleep/week")
def read_weekly_sleep():
    return jsonify(get_weekly_sleep_summary())


@health_blueprint.delete("/api/health/sleep/<sleep_date>")
def remove_sleep_entry(sleep_date: str):
    try:
        deleted = delete_sleep(sleep_date)
    except ValueError as error:
        return jsonify({"error": str(error)}), 400
    if not deleted:
        return jsonify({"error": "Não há sono registrado neste dia."}), 404
    return jsonify({"deleted": True, "date": sleep_date, "week": get_weekly_sleep_summary()})


@health_blueprint.get("/api/health/exercise/today")
def read_today_exercise():
    return jsonify({"entry": get_today_exercise()})


@health_blueprint.post("/api/health/exercise")
def save_exercise_entry():
    data = request.get_json(silent=True) or {}
    try:
        result = save_exercise(
            data.get("type", ""),
            data.get("durationMinutes", ""),
            data.get("note", ""),
            data.get("exerciseDate"),
            data.get("customActivity", ""),
            data.get("distanceKm"),
            data.get("caloriesBurned"),
        )
    except (TypeError, ValueError) as error:
        return jsonify({"error": str(error)}), 400
    return jsonify(result), 201


@health_blueprint.get("/api/health/exercise/week")
def read_weekly_exercise():
    return jsonify(get_weekly_exercise_summary())


@health_blueprint.delete("/api/health/exercise/<exercise_date>")
def remove_exercise_entry(exercise_date: str):
    try:
        deleted = delete_exercise(exercise_date)
    except ValueError as error:
        return jsonify({"error": str(error)}), 400
    if not deleted:
        return jsonify({"error": "Não há exercício registrado neste dia."}), 404
    return jsonify(
        {
            "deleted": True,
            "date": exercise_date,
            "week": get_weekly_exercise_summary(),
        }
    )


@health_blueprint.get("/api/health/weight")
def read_weight_summary():
    try:
        return jsonify(get_weight_summary())
    except ValueError as error:
        return jsonify({"error": str(error)}), 400


@health_blueprint.post("/api/health/weight")
def save_weight_entry():
    data = request.get_json(silent=True) or {}
    try:
        return jsonify(save_today_weight(data.get("weightKg", ""))), 201
    except (TypeError, ValueError) as error:
        return jsonify({"error": str(error)}), 400


@health_blueprint.get("/api/health/report/week")
def read_weekly_health_report():
    try:
        return jsonify(get_weekly_health_report())
    except ValueError as error:
        return jsonify({"error": str(error)}), 400


@health_blueprint.get("/api/health/latest-activity")
def read_latest_health_activity():
    return jsonify({"activity": get_latest_health_activity()})


@health_blueprint.get("/api/health/focus/today")
def read_today_focus():
    return jsonify({"focus": get_today_focus()})


@health_blueprint.post("/api/health/focus/today")
def save_focus_today():
    try:
        return jsonify(save_today_focus((request.get_json(silent=True) or {}).get("text", ""))), 201
    except ValueError as error:
        return jsonify({"error": str(error)}), 400


@health_blueprint.patch("/api/health/focus/today")
def complete_focus_today():
    try:
        return jsonify(set_today_focus_completed(bool((request.get_json(silent=True) or {}).get("completed"))))
    except ValueError as error:
        return jsonify({"error": str(error)}), 400


@health_blueprint.delete("/api/health/focus/today")
def remove_focus_today():
    return jsonify({"deleted": delete_today_focus()})
