from flask import Blueprint, jsonify, render_template, request
from app.modules.health.exercise_service import (
    delete_exercise,
    get_today_exercise,
    get_today_exercises,
    delete_exercise_by_id,
    summarize_exercises,
    get_weekly_exercise_summary,
    get_exercise_week_for_date,
    save_exercise,
    preview_exercise_calories,
)
from app.modules.health.services import create_profile, get_latest_profile, update_latest_profile
from app.modules.health.sleep_service import (
    delete_sleep,
    get_today_sleep,
    get_weekly_sleep_summary,
    get_sleep_week_for_date,
    save_sleep,
)
from app.modules.health.water_service import (
    set_water_portion,
    delete_water_entry,
    clear_water_day,
    add_water_entry,
    get_weekly_water_summary,
    get_water_week_for_date,
    get_today_water_total,
    remove_latest_water_entry,
)
from app.modules.health.weight_service import get_weight_summary, save_today_weight, change_weight_entry, WeightDateConflict, get_weight_chart
from app.modules.health.weekly_report_service import get_weekly_health_report
from app.modules.health.latest_activity_service import get_latest_health_activity
from app.modules.health.daily_focus_service import delete_today_focus, get_today_focus, save_today_focus, set_today_focus_completed
from app.modules.health.records_service import records_preview, export_records, reset_records, RecordsChangedError


health_blueprint = Blueprint("health", __name__)


@health_blueprint.get("/api/health/records")
def read_records_preview():
    try:
        response = jsonify(records_preview())
        response.headers["Cache-Control"] = "no-store"
        return response
    except ValueError as error:
        return jsonify({"error": str(error)}), 400


@health_blueprint.get("/api/health/records/backup")
def download_records_backup():
    try:
        response = jsonify(export_records())
        response.headers["Content-Disposition"] = 'attachment; filename="deleve-saude-backup.json"'
        response.headers["Cache-Control"] = "no-store"
        return response
    except ValueError as error:
        return jsonify({"error": str(error)}), 400


@health_blueprint.post("/api/health/records/reset")
def clear_health_records():
    # Non-simple custom header + JSON prevent cross-origin form submissions.
    if not request.is_json or request.headers.get("X-Deleve-Action") != "reset-records":
        return jsonify({"error": "Confirme a limpeza pelas configurações do Deleve."}), 400
    try:
        return jsonify(reset_records(request.get_json(silent=True)))
    except RecordsChangedError as error:
        return jsonify({"error": str(error)}), 409
    except ValueError as error:
        return jsonify({"error": str(error)}), 400


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
        result = add_water_entry(data.get("amountMl"), data.get("waterDate"))
    except ValueError as error:
        return jsonify({"error": str(error)}), 400
    return jsonify(result), 201


@health_blueprint.put("/api/health/water/portion")
def save_water_portion():
    data = request.get_json(silent=True)
    try:
        if not isinstance(data, dict):
            raise ValueError("Informe o tamanho do copo ou garrafa.")
        set_water_portion(data.get("amountMl"))
        return jsonify(get_latest_profile())
    except ValueError as error:
        return jsonify({"error": str(error)}), 400


@health_blueprint.delete("/api/health/water/day/<water_date>")
def reset_selected_water_day(water_date):
    data = request.get_json(silent=True)
    if not isinstance(data, dict) or data.get("confirmed") is not True:
        return jsonify({"error": "Confirme que deseja zerar a água deste dia."}), 400
    try:
        return jsonify(clear_water_day(water_date, data.get("expectedTotalMl")))
    except ValueError as error:
        return jsonify({"error": str(error)}), 400


@health_blueprint.delete("/api/health/water/<int:entry_id>")
def remove_selected_water_entry(entry_id):
    data = request.get_json(silent=True)
    if not isinstance(data, dict) or data.get("confirmed") is not True:
        return jsonify({"error": "Confirme a exclusão deste registro."}), 400
    try:
        return jsonify(delete_water_entry(entry_id))
    except LookupError as error:
        return jsonify({"error": str(error)}), 404
    except ValueError as error:
        return jsonify({"error": str(error)}), 400


@health_blueprint.delete("/api/health/water/latest")
def remove_water_entry():
    try:
        return jsonify(remove_latest_water_entry())
    except ValueError as error:
        return jsonify({"error": str(error)}), 400


@health_blueprint.get("/api/health/water/week")
def read_weekly_water():
    try:
        return jsonify(get_water_week_for_date(request.args.get("date")))
    except ValueError as error:
        return jsonify({"error": str(error)}), 400


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
    try:
        return jsonify(get_sleep_week_for_date(request.args.get("date")))
    except ValueError as error:
        return jsonify({"error": str(error)}), 400


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
    entries = get_today_exercises()
    return jsonify({"entry": entries[0] if entries else None, "entries": entries, **summarize_exercises(entries)})


@health_blueprint.post("/api/health/exercise/calorie-estimate")
def preview_calories():
    try:
        return jsonify(preview_exercise_calories(request.get_json(silent=True) or {}))
    except (TypeError, ValueError, OverflowError) as error:
        return jsonify({"error": str(error)}), 400


@health_blueprint.post("/api/health/exercise")
@health_blueprint.put("/api/health/exercise/<int:entry_id>")
def save_exercise_entry(entry_id=None):
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
            entry_id=entry_id,
            calorie_source=data.get("calorieSource"),
            effort=data.get("effort"),
            duration_seconds=data.get("durationSeconds"),
        )
    except LookupError as error:
        return jsonify({"error": str(error)}), 404
    except (TypeError, ValueError) as error:
        return jsonify({"error": str(error)}), 400
    return jsonify(result), 200 if entry_id is not None else 201


@health_blueprint.delete("/api/health/exercise/<int:entry_id>")
def remove_exercise_by_id(entry_id: int):
    try:
        deleted = delete_exercise_by_id(entry_id)
    except ValueError as error:
        return jsonify({"error": str(error)}), 400
    if not deleted:
        return jsonify({"error": "Atividade não encontrada."}), 404
    entries = get_today_exercises()
    return jsonify({"deleted": True, "week": get_weekly_exercise_summary(),
                    "today": {"entry": entries[0] if entries else None, "entries": entries,
                              **summarize_exercises(entries)}})


@health_blueprint.get("/api/health/exercise/week")
def read_weekly_exercise():
    try:
        return jsonify(get_exercise_week_for_date(request.args.get("date")))
    except ValueError as error:
        return jsonify({"error": str(error)}), 400


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


@health_blueprint.get("/api/health/weight/chart")
def read_weight_chart():
    try:
        response = jsonify(get_weight_chart(request.args.get("period", "30")))
        response.headers["Cache-Control"] = "no-store"
        return response
    except ValueError as error:
        return jsonify({"error": str(error)}), 400


@health_blueprint.post("/api/health/weight")
def save_weight_entry():
    data = request.get_json(silent=True) or {}
    try:
        if not isinstance(data, dict):
            raise ValueError("Envie os dados da pesagem em JSON.")
        return jsonify(save_today_weight(data.get("weightKg", ""), data.get("recordedOn"))), 201
    except WeightDateConflict as error:
        return jsonify({"error": str(error), "entry": error.entry}), 409
    except (TypeError, ValueError) as error:
        return jsonify({"error": str(error)}), 400


@health_blueprint.route("/api/health/weight/<int:entry_id>", methods=["PUT", "DELETE"])
def edit_or_delete_weight(entry_id):
    try:
        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            raise ValueError("Envie os dados da pesagem em JSON.")
        deleting = request.method == "DELETE"
        if deleting and data.get("confirmed") is not True:
            raise ValueError("Confirme a exclusão da pesagem.")
        return jsonify(change_weight_entry(entry_id, data.get("weightKg"), delete=deleting))
    except LookupError as error:
        return jsonify({"error": str(error)}), 404
    except (TypeError, ValueError) as error:
        return jsonify({"error": str(error)}), 400


@health_blueprint.get("/api/health/report/week")
def read_weekly_health_report():
    try:
        raw_offset = request.args.get("weekOffset", "0")
        try:
            week_offset = int(raw_offset)
        except ValueError:
            return jsonify({"error": "Informe um número inteiro de semanas."}), 400
        return jsonify(get_weekly_health_report(week_offset=week_offset))
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
