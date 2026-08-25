from flask import Blueprint, jsonify, render_template, request
from app.modules.health.services import create_profile, get_latest_profile


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
