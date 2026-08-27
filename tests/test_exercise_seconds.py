import json
from datetime import date

import pytest

from app.core.database import get_database, initialize_database


@pytest.fixture()
def seconds_client(client):
    response = client.post("/api/health/profile", json={
        "name": "Teste de segundos", "heightCm": "175", "weightKg": "80",
        "goals": ["Praticar atividade física"], "exerciseDaysWeek": "3",
    })
    assert response.status_code == 201
    return client


def payload(**changes):
    return {"type": "Corrida", "durationSeconds": 1789, "distanceKm": 3.28,
            "calorieSource": "estimated", **changes}


def test_running_seconds_preview_save_and_read_agree(seconds_client):
    client = seconds_client
    preview = client.post("/api/health/exercise/calorie-estimate", json=payload())
    assert preview.status_code == 200
    response = client.post("/api/health/exercise", json=payload())
    assert response.status_code == 201
    entry = response.get_json()
    assert entry["durationSeconds"] == 1789
    assert entry["durationMinutes"] == 1789 / 60
    assert entry["paceSecondsPerKm"] == 545  # 9:05 /km, not the 9:09 from 30min.
    assert entry["averageSpeedKmh"] is None
    assert entry["calorieEstimate"] == preview.get_json()["estimate"]
    assert entry["calorieEstimate"]["durationSeconds"] == 1789
    assert client.get("/api/health/exercise/today").get_json()["entry"] == entry


def test_cycling_velocity_uses_seconds(seconds_client):
    response = seconds_client.post("/api/health/exercise", json=payload(
        type="Ciclismo", durationSeconds=1815, distanceKm=10,
    ))
    assert response.status_code == 201
    entry = response.get_json()
    assert entry["averageSpeedKmh"] == 19.8
    assert entry["paceSecondsPerKm"] is None


@pytest.mark.parametrize("seconds", [1, 45, 59, 60, 61, 3599, 3600, 3601, 28800])
def test_duration_boundaries_supported(seconds_client, seconds):
    response = seconds_client.post("/api/health/exercise", json=payload(
        type="Musculação", durationSeconds=seconds, distanceKm=None, calorieSource="none",
    ))
    assert response.status_code == 201
    assert response.get_json()["durationSeconds"] == seconds


@pytest.mark.parametrize("seconds", [0, -1, 28801, 60.5, "60.5", "", "NaN", "Infinity", True, {}, []])
def test_invalid_seconds_rejected_by_preview_and_save(seconds_client, seconds):
    for endpoint in ["/api/health/exercise/calorie-estimate", "/api/health/exercise"]:
        assert seconds_client.post(endpoint, json=payload(durationSeconds=seconds)).status_code == 400
    assert seconds_client.get("/api/health/exercise/today").get_json()["activityCount"] == 0


def test_seconds_take_precedence_over_legacy_minutes(seconds_client):
    response = seconds_client.post("/api/health/exercise", json=payload(durationMinutes=30))
    assert response.status_code == 201
    assert response.get_json()["durationSeconds"] == 1789


def test_edit_seconds_updates_only_target_and_preserves_manual_calories(seconds_client):
    client = seconds_client
    first = client.post("/api/health/exercise", json=payload(
        caloriesBurned=420, calorieSource="manual",
    )).get_json()
    second = client.post("/api/health/exercise", json=payload()).get_json()
    changed = client.put(f"/api/health/exercise/{first['id']}", json=payload(
        durationSeconds=1799, caloriesBurned=420, calorieSource="manual",
    )).get_json()
    assert changed["durationSeconds"] == 1799
    assert changed["caloriesBurned"] == 420
    entries = client.get("/api/health/exercise/today").get_json()["entries"]
    assert len(entries) == 2
    assert next(e for e in entries if e["id"] == second["id"]) == second
    assert next(e for e in entries if e["id"] == first["id"]) == changed


def test_totals_use_integer_seconds_and_matching_distance_entries(seconds_client):
    client = seconds_client
    first = client.post("/api/health/exercise", json=payload(durationSeconds=1789, distanceKm=3.28)).get_json()
    client.post("/api/health/exercise", json=payload(durationSeconds=11, distanceKm=0.1))
    client.post("/api/health/exercise", json=payload(durationSeconds=20, distanceKm=None))
    client.post("/api/health/exercise", json=payload(type="Ciclismo", durationSeconds=65, distanceKm=0.5))
    for endpoint in ["/api/health/exercise/today", "/api/health/exercise/week", "/api/health/report/week"]:
        body = client.get(endpoint).get_json()
        summary = body["exercise"] if endpoint.endswith("report/week") else body
        assert summary["totalSeconds"] == 1885
        assert summary["totalMinutes"] == 1885 / 60
        running = next(m for m in summary["byModality"] if m["type"] == "Corrida")
        assert running["totalSeconds"] == 1820
        assert running["paceSecondsPerKm"] == 533  # 1800s over 3.38km; exclude no-distance run.
    week = client.get("/api/health/exercise/week").get_json()
    today = next(d for d in week["days"] if d["isToday"])
    assert today["totalSeconds"] == 1885
    deleted = client.delete(f"/api/health/exercise/{first['id']}").get_json()
    assert deleted["today"]["totalSeconds"] == 96


def test_old_rows_keep_minutes_and_estimate_snapshot_after_migration(seconds_client, app):
    client = seconds_client
    entry = client.post("/api/health/exercise", json=payload(durationSeconds=1800)).get_json()
    legacy_estimate = dict(entry["calorieEstimate"])
    legacy_estimate.pop("durationSeconds")
    with app.app_context():
        db = get_database()
        db.execute("UPDATE health_exercise_entries SET calorie_estimate = ?", (json.dumps(legacy_estimate),))
        db.execute("ALTER TABLE health_exercise_entries DROP COLUMN duration_seconds")
        db.commit()
        before = dict(db.execute("SELECT * FROM health_exercise_entries").fetchone())
        initialize_database()
        initialize_database()
        after = dict(db.execute("SELECT * FROM health_exercise_entries").fetchone())
        assert {k: after[k] for k in before} == before
        assert after["duration_seconds"] is None
    saved = client.put(f"/api/health/exercise/{entry['id']}",
                       json=payload(durationSeconds=1800, note="Só observação")).get_json()
    assert saved["durationSeconds"] == 1800
    assert saved["calorieEstimate"] == legacy_estimate
    assert saved["caloriesBurned"] == entry["caloriesBurned"]


def test_old_minutes_payload_still_supported(seconds_client):
    response = seconds_client.post("/api/health/exercise", json={
        "type": "Dança", "durationMinutes": 30,
    })
    assert response.status_code == 201
    assert response.get_json()["durationSeconds"] == 1800
    assert response.get_json()["durationMinutes"] == 30


def test_seconds_preserved_by_multiple_activity_migration(seconds_client, app):
    entry = seconds_client.post("/api/health/exercise", json=payload()).get_json()
    with app.app_context():
        db = get_database()
        db.execute("CREATE UNIQUE INDEX old_daily ON health_exercise_entries(profile_id, exercise_date)")
        db.commit()
        initialize_database()
        initialize_database()
        assert db.execute("SELECT typeof(duration_seconds) FROM health_exercise_entries").fetchone()[0] == "integer"
    assert seconds_client.get("/api/health/exercise/today").get_json()["entry"] == entry


def test_seconds_change_recalculates_calories_but_note_edit_preserves_snapshot(seconds_client):
    client = seconds_client
    data = payload(type="Musculação", distanceKm=None, durationSeconds=1800)
    entry = client.post("/api/health/exercise", json=data).get_json()
    assert entry["caloriesBurned"] == 100
    changed = client.put(f"/api/health/exercise/{entry['id']}",
                         json={**data, "durationSeconds": 1830}).get_json()
    assert changed["caloriesBurned"] == 102
    assert changed["calorieEstimate"]["durationSeconds"] == 1830
    note = client.put(f"/api/health/exercise/{entry['id']}",
                     json={**data, "durationSeconds": 1830, "note": "Observação"}).get_json()
    assert note["calorieEstimate"] == changed["calorieEstimate"]
