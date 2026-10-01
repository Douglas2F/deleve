from app.core.database import get_database, initialize_database


def test_database_creates_health_profiles_table(app):
    with app.app_context():
        initialize_database()
        table = get_database().execute(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
            ("health_profiles",),
        ).fetchone()

    assert table is not None

