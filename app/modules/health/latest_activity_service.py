from app.core.database import get_database


def get_latest_health_activity() -> dict | None:
    """Retorna a categoria de Saúde alterada mais recentemente hoje."""
    row = get_database().execute(
        """
        SELECT kind, created_at FROM (
            SELECT 'water' AS kind, created_at
            FROM health_water_entries
            WHERE profile_id = (SELECT id FROM health_profiles ORDER BY id DESC LIMIT 1)
              AND date(recorded_at, 'localtime') = date('now', 'localtime')
            UNION ALL
            SELECT 'sleep', created_at FROM health_sleep_entries
            WHERE profile_id = (SELECT id FROM health_profiles ORDER BY id DESC LIMIT 1)
              AND sleep_date = date('now', 'localtime')
            UNION ALL
            SELECT 'exercise', created_at FROM health_exercise_entries
            WHERE profile_id = (SELECT id FROM health_profiles ORDER BY id DESC LIMIT 1)
              AND exercise_date = date('now', 'localtime')
            UNION ALL
            SELECT 'weight', created_at FROM health_weight_entries
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
    return {"kind": row["kind"], "recordedAt": row["created_at"]}
