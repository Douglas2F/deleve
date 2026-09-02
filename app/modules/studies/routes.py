from flask import Blueprint, jsonify, request

from app.modules.studies.service import (
    create_subject,
    create_task,
    delete_subject,
    delete_task,
    overview,
    record_session,
    update_task,
)


studies_blueprint = Blueprint("studies", __name__)


@studies_blueprint.get("/api/studies/overview")
def read_studies_overview():
    try:
        return jsonify(overview(request.args.get("date")))
    except ValueError as error:
        return jsonify({"error": str(error)}), 400


@studies_blueprint.post("/api/studies/subjects")
def save_study_subject():
    try:
        return jsonify(create_subject(request.get_json(silent=True) or {})), 201
    except ValueError as error:
        return jsonify({"error": str(error)}), 400


@studies_blueprint.delete("/api/studies/subjects/<int:subject_id>")
def remove_study_subject(subject_id: int):
    try:
        if not delete_subject(subject_id):
            return jsonify({"error": "Matéria não encontrada."}), 404
        return jsonify({"deleted": True})
    except ValueError as error:
        return jsonify({"error": str(error)}), 409


@studies_blueprint.post("/api/studies/tasks")
def save_study_task():
    try:
        return jsonify(create_task(request.get_json(silent=True) or {})), 201
    except ValueError as error:
        return jsonify({"error": str(error)}), 400


@studies_blueprint.put("/api/studies/tasks/<int:task_id>")
@studies_blueprint.patch("/api/studies/tasks/<int:task_id>")
def change_study_task(task_id: int):
    try:
        return jsonify(update_task(task_id, request.get_json(silent=True) or {}))
    except LookupError as error:
        return jsonify({"error": str(error)}), 404
    except ValueError as error:
        return jsonify({"error": str(error)}), 400


@studies_blueprint.delete("/api/studies/tasks/<int:task_id>")
def remove_study_task(task_id: int):
    if not delete_task(task_id):
        return jsonify({"error": "Tarefa não encontrada."}), 404
    return jsonify({"deleted": True})


@studies_blueprint.post("/api/studies/tasks/<int:task_id>/sessions")
def save_study_session(task_id: int):
    try:
        return jsonify(record_session(task_id, request.get_json(silent=True) or {})), 201
    except LookupError as error:
        return jsonify({"error": str(error)}), 404
    except ValueError as error:
        return jsonify({"error": str(error)}), 400
