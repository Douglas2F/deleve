"""Explicit, profile-scoped export and reset of health records."""
import hashlib
import json
from datetime import datetime, timezone

from app.core.database import get_database

# Fixed allowlist: never accept table names or profile IDs from the client.
RECORD_TABLES = {
    "water": "health_water_entries", "sleep": "health_sleep_entries",
    "exercise": "health_exercise_entries", "weight": "health_weight_entries",
    "focus": "health_daily_focus",
}


class RecordsChangedError(ValueError):
    pass


def _snapshot(database):
    profile = database.execute("SELECT * FROM health_profiles ORDER BY id DESC LIMIT 1").fetchone()
    if profile is None:
        raise ValueError("Configure seu perfil antes de gerenciar os registros.")
    profile_id = profile["id"]
    return {
        "profile": dict(profile),
        "goals": [dict(row) for row in database.execute("SELECT * FROM health_goals WHERE profile_id = ? ORDER BY id", (profile_id,))],
        "records": {key: [dict(row) for row in database.execute(f"SELECT * FROM {table} WHERE profile_id = ? ORDER BY id", (profile_id,))]
                    for key, table in RECORD_TABLES.items()},
    }


def _revision(snapshot):
    return hashlib.sha256(json.dumps(snapshot, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def records_preview():
    database = get_database()
    # One consistent snapshot, even when another tab is saving a record.
    database.execute("BEGIN")
    try:
        snapshot = _snapshot(database)
        return {"revision": _revision(snapshot), "counts": {key: len(rows) for key, rows in snapshot["records"].items()},
                "profileName": snapshot["profile"]["name"], "profileWeightKg": snapshot["profile"]["current_weight_kg"]}
    finally:
        database.rollback()


def export_records():
    database = get_database()
    database.execute("BEGIN")
    try:
        snapshot = _snapshot(database)
        return {"format": "deleve-health-backup", "version": 1,
                "exportedAt": datetime.now(timezone.utc).isoformat(), **snapshot}
    finally:
        database.rollback()


def reset_records(data):
    if not isinstance(data, dict) or data.get("confirmation") != "APAGAR" or not isinstance(data.get("revision"), str):
        raise ValueError("Digite APAGAR e confirme os registros antes de continuar.")
    database = get_database()
    database.execute("BEGIN IMMEDIATE")
    try:
        snapshot = _snapshot(database)
        if data["revision"] != _revision(snapshot):
            raise RecordsChangedError("Os dados mudaram. Feche e abra a confirmação para revisar antes de apagar.")
        deleted = {}
        for key, table in RECORD_TABLES.items():
            deleted[key] = database.execute(f"DELETE FROM {table} WHERE profile_id = ?", (snapshot["profile"]["id"],)).rowcount
        database.commit()
        return {"deleted": deleted, "message": "Registros apagados. Perfil e metas preservados."}
    except Exception:
        database.rollback()
        raise
