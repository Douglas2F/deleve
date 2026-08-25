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


@click.command("init-db")
def initialize_database_command() -> None:
    """Cria as tabelas iniciais do banco de dados."""
    initialize_database()
    click.echo("Banco de dados inicializado.")


def init_app(app: Flask) -> None:
    app.teardown_appcontext(close_database)
    app.cli.add_command(initialize_database_command)

