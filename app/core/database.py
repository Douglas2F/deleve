import sqlite3
from pathlib import Path

import click
from flask import Flask, current_app, g


def get_database() -> sqlite3.Connection:
    """Abre uma conexão por requisição e reutiliza-a quando necessário."""
    if "database" not in g:
        database_path = Path(current_app.config["DATABASE"])
        database_path.parent.mkdir(parents=True, exist_ok=True)
        g.database = sqlite3.connect(database_path)
        g.database.row_factory = sqlite3.Row

    return g.database


def close_database(_error: BaseException | None = None) -> None:
    database = g.pop("database", None)
    if database is not None:
        database.close()


def initialize_database() -> None:
    schema_path = Path(__file__).with_name("schema.sql")
    database = get_database()
    database.executescript(schema_path.read_text(encoding="utf-8"))
    _apply_migrations(database)
    database.commit()


def _apply_migrations(database: sqlite3.Connection) -> None:
    """Atualiza bancos já existentes sem apagar os registros do usuário."""
    exercise_columns = {
        row["name"]
        for row in database.execute("PRAGMA table_info(health_exercise_entries)").fetchall()
    }
    if "distance_km" not in exercise_columns:
        database.execute(
            "ALTER TABLE health_exercise_entries ADD COLUMN distance_km REAL"
        )
    if "calories_burned" not in exercise_columns:
        database.execute(
            "ALTER TABLE health_exercise_entries ADD COLUMN calories_burned INTEGER"
        )
    water_columns = {
        row["name"]
        for row in database.execute("PRAGMA table_info(health_water_entries)").fetchall()
    }
    if "created_at" not in water_columns:
        database.execute("ALTER TABLE health_water_entries ADD COLUMN created_at TEXT")
        database.execute(
            "UPDATE health_water_entries SET created_at = recorded_at WHERE created_at IS NULL"
        )


@click.command("init-db")
def initialize_database_command() -> None:
    """Cria as tabelas iniciais do banco de dados."""
    initialize_database()
    click.echo("Banco de dados inicializado.")


def init_app(app: Flask) -> None:
    app.teardown_appcontext(close_database)
    app.cli.add_command(initialize_database_command)
