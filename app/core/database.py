import sqlite3
from datetime import datetime
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
    profile_columns = {row["name"] for row in database.execute("PRAGMA table_info(health_profiles)")}
    if "water_portion_ml" not in profile_columns:
        database.execute("ALTER TABLE health_profiles ADD COLUMN water_portion_ml INTEGER NOT NULL DEFAULT 250 CHECK (water_portion_ml BETWEEN 50 AND 2000)")
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


    _migrate_multiple_exercises(database)
    calorie_columns = {row["name"] for row in database.execute("PRAGMA table_info(health_exercise_entries)")}
    for name in ("calorie_source", "calorie_estimate", "effort"):
        if name not in calorie_columns:
            database.execute(f"ALTER TABLE health_exercise_entries ADD COLUMN {name} TEXT")
    if "duration_seconds" not in calorie_columns:
        database.execute("""
            ALTER TABLE health_exercise_entries ADD COLUMN duration_seconds INTEGER
            CHECK (duration_seconds IS NULL OR
                   (typeof(duration_seconds) = 'integer' AND duration_seconds BETWEEN 1 AND 28800))
        """)


def _migrate_multiple_exercises(database: sqlite3.Connection) -> None:
    indexes = database.execute("PRAGMA index_list(health_exercise_entries)").fetchall()
    daily_unique = any(
        row["unique"] and [column["name"] for column in database.execute(
            "SELECT name FROM pragma_index_info(?) ORDER BY seqno", (row["name"],)
        )] == ["profile_id", "exercise_date"]
        for row in indexes
    )
    if not daily_unique:
        return
    # Snapshot before the atomic replacement; existing IDs and timestamps survive.
    database.commit()
    database_file = database.execute("PRAGMA database_list").fetchone()["file"]
    if database_file:
        backup_path = Path(database_file).with_name(
            f"assistant.pre-multi-exercise-{datetime.now():%Y%m%d%H%M%S%f}.sqlite3"
        )
        with sqlite3.connect(backup_path) as backup:
            database.backup(backup)
    database.execute("SAVEPOINT multiple_exercises")
    try:
        sequence = database.execute(
            "SELECT seq FROM sqlite_sequence WHERE name = 'health_exercise_entries'"
        ).fetchone()
        database.execute("""
            CREATE TABLE health_exercise_entries_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                profile_id INTEGER NOT NULL,
                exercise_date TEXT NOT NULL,
                exercise_type TEXT NOT NULL,
                duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
                distance_km REAL CHECK (distance_km IS NULL OR distance_km > 0),
                calories_burned INTEGER CHECK (calories_burned IS NULL OR calories_burned > 0),
                note TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (profile_id) REFERENCES health_profiles (id)
            )
        """)
        database.execute("""
            INSERT INTO health_exercise_entries_new
                (id, profile_id, exercise_date, exercise_type, duration_minutes,
                 distance_km, calories_burned, note, created_at)
            SELECT id, profile_id, exercise_date, exercise_type, duration_minutes,
                   distance_km, calories_burned, note, created_at
            FROM health_exercise_entries
        """)
        previous_columns = {row["name"] for row in database.execute("PRAGMA table_info(health_exercise_entries)")}
        for name in ("calorie_source", "calorie_estimate", "effort", "duration_seconds"):
            if name in previous_columns:
                column_type = "INTEGER" if name == "duration_seconds" else "TEXT"
                database.execute(f"ALTER TABLE health_exercise_entries_new ADD COLUMN {name} {column_type}")
                database.execute(f"""
                    UPDATE health_exercise_entries_new SET {name} = (
                        SELECT {name} FROM health_exercise_entries
                        WHERE health_exercise_entries.id = health_exercise_entries_new.id
                    )
                """)
        database.execute("DROP TABLE health_exercise_entries")
        database.execute("ALTER TABLE health_exercise_entries_new RENAME TO health_exercise_entries")
        if sequence:
            database.execute(
                "UPDATE sqlite_sequence SET seq = MAX(seq, ?) WHERE name = 'health_exercise_entries'",
                (sequence["seq"],),
            )
            database.execute("""
                INSERT INTO sqlite_sequence (name, seq)
                SELECT 'health_exercise_entries', ?
                WHERE NOT EXISTS (SELECT 1 FROM sqlite_sequence WHERE name = 'health_exercise_entries')
            """, (sequence["seq"],))
        database.execute("CREATE INDEX health_exercise_profile_date ON health_exercise_entries(profile_id, exercise_date)")
        database.execute("RELEASE SAVEPOINT multiple_exercises")
    except Exception:
        database.execute("ROLLBACK TO SAVEPOINT multiple_exercises")
        database.execute("RELEASE SAVEPOINT multiple_exercises")
        raise


@click.command("init-db")
def initialize_database_command() -> None:
    """Cria as tabelas iniciais do banco de dados."""
    initialize_database()
    click.echo("Banco de dados inicializado.")


def init_app(app: Flask) -> None:
    app.teardown_appcontext(close_database)
    app.cli.add_command(initialize_database_command)
