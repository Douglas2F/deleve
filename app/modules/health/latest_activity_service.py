from app.core.database import get_database


def get_latest_health_activities() -> dict:
    """Retorna o registro mais recente de hoje para cada categoria de Saúde."""
    database = get_database()
    sources = {
        "water": ("health_water_entries", "date(recorded_at, 'localtime')", "amount_ml"),
        "sleep": ("health_sleep_entries", "sleep_date", None),
        "exercise": ("health_exercise_entries", "exercise_date", None),
        "weight": ("health_weight_entries", "recorded_on", None),
    }
    activities = {}
    for kind, (table, date_column, value_column) in sources.items():
        selected_columns = f"created_at, {value_column}" if value_column else "created_at"
        row = database.execute(
            f"""
            SELECT {selected_columns}
            FROM {table}
            WHERE profile_id = (SELECT id FROM health_profiles ORDER BY id DESC LIMIT 1)
              AND {date_column} = date('now', 'localtime')
            ORDER BY created_at DESC, id DESC
            LIMIT 1
            """
        ).fetchone()
        if row is None:
            continue
        activity = {"kind": kind, "recordedAt": row["created_at"]}
        if kind == "water":
            activity["amountMl"] = int(row["amount_ml"])
        activities[kind] = activity
    return activities


def get_latest_health_activity() -> dict | None:
    """Retorna a categoria de Saúde alterada mais recentemente hoje."""
    row = get_database().execute(
        """
        SELECT kind, entry_id, created_at FROM (
            SELECT 'water' AS kind, id AS entry_id, created_at
            FROM health_water_entries
            WHERE profile_id = (SELECT id FROM health_profiles ORDER BY id DESC LIMIT 1)
              AND date(recorded_at, 'localtime') = date('now', 'localtime')
            UNION ALL
            SELECT 'sleep', id, created_at FROM health_sleep_entries
            WHERE profile_id = (SELECT id FROM health_profiles ORDER BY id DESC LIMIT 1)
              AND sleep_date = date('now', 'localtime')
            UNION ALL
            SELECT 'exercise', id, created_at FROM health_exercise_entries
            WHERE profile_id = (SELECT id FROM health_profiles ORDER BY id DESC LIMIT 1)
              AND exercise_date = date('now', 'localtime')
            UNION ALL
            SELECT 'weight', id, created_at FROM health_weight_entries
            WHERE profile_id = (SELECT id FROM health_profiles ORDER BY id DESC LIMIT 1)
              AND recorded_on = date('now', 'localtime')
        )
        WHERE created_at IS NOT NULL
        ORDER BY created_at DESC
        LIMIT 1
        """
    ).fetchone()
    if row is None:
        return None
    activity = {"kind": row["kind"], "recordedAt": row["created_at"]}
    if row["kind"] == "water":
        water = get_database().execute(
            "SELECT amount_ml FROM health_water_entries WHERE id = ?",
            (row["entry_id"],),
        ).fetchone()
        if water is not None:
            activity["amountMl"] = int(water["amount_ml"])
    return activity
