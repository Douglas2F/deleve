import sqlite3

import pytest

from app import create_app
from app.core.database import initialize_database


@pytest.fixture()
def profile(client):
    client.post("/api/health/profile", json={"name": "Teste", "heightCm": 175, "weightKg": 80, "goals": ["Beber mais água"], "waterGoalMl": 2000})
    return client


@pytest.mark.parametrize("amount", [50, 750, 900, 2000])
def test_preference_persists_and_changes_default_without_recording_water(profile, amount):
    assert profile.get("/api/health/profile").json["waterPortionMl"] == 250
    result = profile.put("/api/health/water/portion", json={"amountMl": amount})
    assert result.status_code == 200
    assert result.json["waterPortionMl"] == amount
    assert profile.get("/api/health/profile").json["waterPortionMl"] == amount
    assert profile.get("/api/health/water/today").json["totalMl"] == 0
    assert profile.get("/api/health/latest-activity").json["activity"] is None
    assert profile.post("/api/health/water", json={}).json["totalMl"] == amount
    assert profile.delete("/api/health/water/latest").json["removedAmountMl"] == amount
    assert profile.post("/api/health/water", json={"amountMl": 250}).json["totalMl"] == 250
    assert profile.get("/api/health/profile").json["waterPortionMl"] == amount


@pytest.mark.parametrize("amount", [None, True, 49, 2001, 750.5, "900", [], {}])
def test_invalid_sizes_do_not_change_profile(profile, amount):
    before = profile.get("/api/health/profile").json
    assert profile.put("/api/health/water/portion", json={"amountMl": amount}).status_code == 400
    assert profile.get("/api/health/profile").json == before


def test_profile_edit_and_records_reset_preserve_preference(profile):
    profile.put("/api/health/water/portion", json={"amountMl": 900})
    profile.put("/api/health/profile", json={"name": "Novo nome", "heightCm": 175, "goals": ["Beber mais água"], "waterGoalMl": 2500})
    revision = profile.get("/api/health/records").json["revision"]
    assert profile.post("/api/health/records/reset", json={"confirmation": "APAGAR", "revision": revision}, headers={"X-Deleve-Action":"reset-records"}).status_code == 200
    assert profile.get("/api/health/profile").json["waterPortionMl"] == 900
    assert profile.get("/api/health/records/backup").json["profile"]["water_portion_ml"] == 900
    profile.post("/api/health/profile", json={"name":"Outro", "heightCm":170,"weightKg":70,"goals":["Bem-estar geral"]})
    assert profile.get("/api/health/profile").json["waterPortionMl"] == 250


def test_missing_profile_and_payload(client):
    assert client.put("/api/health/water/portion", json={"amountMl":900}).status_code == 400
    assert client.put("/api/health/water/portion", json=[]).status_code == 400


def test_legacy_database_migration_is_idempotent_and_preserves_data(tmp_path):
    path = tmp_path / "legacy.sqlite3"
    with sqlite3.connect(path) as db:
        db.execute("CREATE TABLE health_profiles (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, height_cm REAL NOT NULL, current_weight_kg REAL NOT NULL, goal TEXT NOT NULL, sleep_goal_hours REAL NOT NULL, water_goal_ml INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)")
        db.execute("INSERT INTO health_profiles (name,height_cm,current_weight_kg,goal,sleep_goal_hours,water_goal_ml) VALUES ('Antes',175,80,'Beber mais água',8,2000)")
    app = create_app({"TESTING": True, "DATABASE": path})
    with app.app_context():
        initialize_database()
    body = app.test_client().get("/api/health/profile").json
    assert body["name"] == "Antes"
    assert body["weightKg"] == 80
    assert body["waterGoalMl"] == 2000
    assert body["waterPortionMl"] == 250
