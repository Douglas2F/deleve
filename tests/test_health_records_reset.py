import sqlite3

import pytest

from app.core.database import get_database
from app.modules.health.records_service import RECORD_TABLES

HEADERS = {"X-Deleve-Action": "reset-records"}


@pytest.fixture()
def records(client):
    assert client.post("/api/health/profile", json={"name": "Teste limpeza", "heightCm": 175, "weightKg": 80,
        "goals": ["Beber mais água", "Dormir melhor", "Praticar atividade física"],
        "waterGoalMl": 2000, "sleepGoalHours": 8, "exerciseDaysWeek": 3}).status_code == 201
    for url, data in [
        ("/api/health/water", {"amountMl": 250}),
        ("/api/health/sleep", {"bedtime": "23:00", "wakeTime": "07:00"}),
        ("/api/health/exercise", {"type": "Ciclismo", "durationSeconds": 1234, "durationMinutes": 21, "distanceKm": 5, "caloriesBurned": 120}),
        ("/api/health/weight", {"weightKg": 79}),
        ("/api/health/focus/today", {"text": "Caminhar hoje"}),
    ]:
        response = client.post(url, json=data)
        assert response.status_code == 201, response.json
    return client


def payload(client):
    return {"confirmation": "APAGAR", "revision": client.get("/api/health/records").json["revision"]}


def test_preview_and_backup_are_read_only_and_complete(records):
    before = records.get("/api/health/records")
    assert before.json["counts"] == dict.fromkeys(RECORD_TABLES, 1)
    assert before.headers["Cache-Control"] == "no-store"
    exported = records.get("/api/health/records/backup")
    assert exported.status_code == 200
    assert exported.headers["Content-Disposition"].startswith("attachment;")
    assert exported.headers["Cache-Control"] == "no-store"
    backup = exported.json
    assert backup["format"] == "deleve-health-backup"
    assert backup["version"] == 1
    assert backup["profile"]["name"] == "Teste limpeza"
    assert len(backup["goals"]) == 3
    assert {key: len(rows) for key, rows in backup["records"].items()} == dict.fromkeys(RECORD_TABLES, 1)
    assert backup["records"]["exercise"][0]["duration_seconds"] == 1234
    assert records.get("/api/health/records").json == before.json


def test_reset_clears_all_history_preserves_profile_goals_and_can_record_again(records, app):
    with app.app_context():
        db = get_database()
        db.execute("INSERT INTO health_water_entries (profile_id, amount_ml, recorded_at) VALUES (1, 1000, '2020-01-01 12:00:00')")
        db.commit()
    backup = records.get("/api/health/records/backup").json
    response = records.post("/api/health/records/reset", json=payload(records), headers=HEADERS)
    assert response.status_code == 200
    assert response.json["deleted"]["water"] == 2
    after = records.get("/api/health/records/backup").json
    assert after["profile"] == backup["profile"]
    assert after["goals"] == backup["goals"]
    assert all(rows == [] for rows in after["records"].values())
    assert records.get("/api/health/latest-activity").json == {"activity": None}
    assert records.get("/api/health/report/week").json["recordedAreas"] == 0
    assert records.get("/api/health/weight").json["changeKg"] == 0
    assert records.get("/api/health/weight").json["currentWeightKg"] == 80
    assert records.post("/api/health/water", json={"amountMl": 250}).status_code == 201


@pytest.mark.parametrize("body", [None, [], {}, {"confirmation": "apagar"}, {"confirmation": "APAGAR"}, {"confirmation": "APAGAR", "revision": 1}])
def test_reset_requires_explicit_confirmation_and_revision(records, body):
    before = records.get("/api/health/records").json
    assert records.post("/api/health/records/reset", json=body, headers=HEADERS).status_code == 400
    assert records.get("/api/health/records").json == before


def test_cross_origin_style_form_or_missing_header_cannot_reset(records):
    before = records.get("/api/health/records").json
    assert records.post("/api/health/records/reset", json=payload(records)).status_code == 400
    assert records.post("/api/health/records/reset", data=payload(records), headers=HEADERS).status_code == 400
    assert records.get("/api/health/records").json == before


def test_new_records_after_preview_require_review(records):
    old = payload(records)
    records.post("/api/health/water", json={"amountMl": 500})
    assert records.post("/api/health/records/reset", json=old, headers=HEADERS).status_code == 409
    assert records.get("/api/health/records").json["counts"]["water"] == 2


def test_reset_is_scoped_to_current_profile_and_rejects_changed_profile(records):
    old = payload(records)
    records.post("/api/health/profile", json={"name": "Segundo", "heightCm": 170, "weightKg": 70, "goals": ["Bem-estar geral"]})
    assert records.post("/api/health/records/reset", json=old, headers=HEADERS).status_code == 409
    assert records.get("/api/health/records/backup").json["records"]["water"] == []
    records.post("/api/health/water", json={"amountMl": 500})
    assert records.post("/api/health/records/reset", json=payload(records), headers=HEADERS).status_code == 200


def test_other_profile_records_survive_reset(records, app):
    records.post("/api/health/profile", json={"name": "Segundo", "heightCm": 170, "weightKg": 70, "goals": ["Bem-estar geral"]})
    records.post("/api/health/water", json={"amountMl": 500})
    records.post("/api/health/records/reset", json=payload(records), headers=HEADERS)
    with app.app_context():
        for table in RECORD_TABLES.values():
            assert get_database().execute(f"SELECT COUNT(*) FROM {table} WHERE profile_id = 1").fetchone()[0] == 1


def test_failure_rolls_back_the_entire_reset(records, app):
    before = records.get("/api/health/records").json
    with app.app_context():
        db = get_database()
        db.execute("CREATE TRIGGER fail_reset BEFORE DELETE ON health_sleep_entries BEGIN SELECT RAISE(ABORT, 'test failure'); END")
        db.commit()
    with pytest.raises(sqlite3.IntegrityError):
        records.post("/api/health/records/reset", json=payload(records), headers=HEADERS)
    assert records.get("/api/health/records").json == before


def test_no_profile_has_nothing_to_export_or_reset(client):
    assert client.get("/api/health/records").status_code == 400
    assert client.get("/api/health/records/backup").status_code == 400
    assert client.post("/api/health/records/reset", json={"confirmation": "APAGAR", "revision": "none"}, headers=HEADERS).status_code == 400
