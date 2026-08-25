from pathlib import Path

from flask import Flask

from app.core.database import init_app as init_database, initialize_database
from app.modules.health.routes import health_blueprint


def create_app(test_config: dict | None = None) -> Flask:
    """Cria e configura uma instância da aplicação."""
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_mapping(
        DATABASE=Path(app.instance_path) / "assistant.sqlite3",
        SECRET_KEY="development-only-change-me",
    )

    if test_config:
        app.config.update(test_config)

    Path(app.instance_path).mkdir(parents=True, exist_ok=True)

    init_database(app)
    app.register_blueprint(health_blueprint)

    with app.app_context():
        initialize_database()

    return app
