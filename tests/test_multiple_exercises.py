from datetime import date, timedelta
from pathlib import Path
import sqlite3

import pytest

from app.core.database import get_database, initialize_database


@pytest.fixture()
def exercise_client(client):
    client.post("/api/health/profile", json={
        "name": "Teste", "heightCm": "175", "weightKg": "78",
        "goals": ["Praticar atividade física"], "exerciseDaysWeek": "3",
    })
    return client


def add(client, kind="Ciclismo", minutes=20, distance=5, calories=None):
    response = client.post("/api/health/exercise", json={
        "type": kind, "durationMinutes": minutes, "distanceKm": distance,
        "caloriesBurned": calories,
    })
    assert response.status_code == 201
    return response.get_json()


def test_bike_gym_bike_counted_separately(exercise_client):
    client = exercise_client
    first = add(client, calories=120)
    gym = add(client, "Musculação", 60, None, 400)
    last = add(client, minutes=30, calories=150)
    assert len({first["id"], gym["id"], last["id"]}) == 3
    today = client.get("/api/health/exercise/today").get_json()
    assert today["entry"]["id"] == last["id"]
    assert today["activityCount"] == 3
    assert len(today["entries"]) == 3
    assert today["totalMinutes"] == 110
    assert today["totalCalories"] == 670
    week = client.get("/api/health/exercise/week").get_json()
    assert week["completedDays"] == 1
    assert week["activityCount"] == 3
    assert week["totalMinutes"] == 110
    cycling = week["distanceByModality"][0]
    assert cycling["totalKm"] == 10
    assert cycling["totalMinutes"] == 50
    assert cycling["averageSpeedKmh"] == 12
    assert cycling["paceSecondsPerKm"] is None
    selected = next(day for day in week["days"] if day["isToday"])
    assert len(selected["entries"]) == 3
    assert selected["type"] is None
    report = client.get("/api/health/report/week").get_json()["exercise"]
    assert report["completedDays"] == 1
    assert report["activityCount"] == 3
    assert report["modalities"] == ["Ciclismo", "Musculação"]
    assert report["byModality"][1]["totalMinutes"] == 60


def test_edit_and_delete_only_selected_activity(exercise_client):
    client = exercise_client
    first = add(client)
    gym = add(client, "Musculação", 60, None)
    last = add(client)
    response = client.put(f"/api/health/exercise/{first['id']}", json={
        "type": "Ciclismo", "durationMinutes": 25, "distanceKm": 6, "note": "Ida",
    })
    assert response.status_code == 200
    today = client.get("/api/health/exercise/today").get_json()
    assert today["activityCount"] == 3
    assert today["entry"]["id"] == first["id"]
    assert next(e for e in today["entries"] if e["id"] == gym["id"])["durationMinutes"] == 60
    response = client.delete(f"/api/health/exercise/{last['id']}")
    assert response.status_code == 200
    assert response.get_json()["week"]["completedDays"] == 1
    assert response.get_json()["today"]["activityCount"] == 2
    assert response.get_json()["today"]["totalMinutes"] == 85
    assert client.delete(f"/api/health/exercise/{last['id']}").status_code == 404
    client.delete(f"/api/health/exercise/{first['id']}")
    response = client.delete(f"/api/health/exercise/{gym['id']}")
    assert response.get_json()["week"]["completedDays"] == 0
    assert response.get_json()["today"]["entry"] is None
    assert client.get("/api/health/report/week").get_json()["exercise"]["activityCount"] == 0


def test_legacy_date_delete_never_removes_multiple_entries(exercise_client):
    add(exercise_client)
    add(exercise_client)
    response = exercise_client.delete(f"/api/health/exercise/{date.today().isoformat()}")
    assert response.status_code == 400
    assert exercise_client.get("/api/health/exercise/today").get_json()["activityCount"] == 2


def test_missing_or_other_profile_ids_cannot_be_changed(exercise_client):
    client = exercise_client
    entry = add(client)
    client.post("/api/health/profile", json={
        "name": "Outro", "heightCm": "175", "weightKg": "78", "goals": ["Bem-estar geral"],
    })
    for entry_id in [entry["id"], 99999]:
        assert client.put(f"/api/health/exercise/{entry_id}", json={
            "type": "Musculação", "durationMinutes": 60,
        }).status_code == 404
        assert client.delete(f"/api/health/exercise/{entry_id}").status_code == 404


def test_invalid_edit_preserves_original_and_others(exercise_client):
    first = add(exercise_client)
    add(exercise_client)
    response = exercise_client.put(f"/api/health/exercise/{first['id']}", json={
        "type": "Ciclismo", "durationMinutes": 0, "distanceKm": 5,
    })
    assert response.status_code == 400
    today = exercise_client.get("/api/health/exercise/today").get_json()
    assert today["activityCount"] == 2
    assert today["totalMinutes"] == 40


def test_previous_day_changes_do_not_replace_today(exercise_client, app):
    client = exercise_client
    today_entry = add(client)
    monday = date.today() - timedelta(days=date.today().weekday())
    if monday == date.today():
        pytest.skip("No earlier day in the current week")
    payload = {"type": "Musculação", "durationMinutes": 60, "exerciseDate": monday.isoformat()}
    first = client.post("/api/health/exercise", json=payload).get_json()
    second = client.post("/api/health/exercise", json=payload).get_json()
    edited = client.put(f"/api/health/exercise/{first['id']}", json={
        "type": "Musculação", "durationMinutes": 45,
    })
    assert edited.get_json()["date"] == monday.isoformat()
    assert client.get("/api/health/exercise/week").get_json()["completedDays"] == 2
    assert client.get("/api/health/exercise/today").get_json()["entry"]["id"] == today_entry["id"]
    assert client.delete(f"/api/health/exercise/{first['id']}").get_json()["week"]["completedDays"] == 2
    assert client.delete(f"/api/health/exercise/{second['id']}").get_json()["week"]["completedDays"] == 1


def test_performance_uses_only_matching_distance_entries(exercise_client):
    add(exercise_client, "Corrida", 20, 2)
    add(exercise_client, "Corrida", 30, 6)
    add(exercise_client, "Corrida", 60, None)
    add(exercise_client, "Ciclismo", 30, 10)
    week = exercise_client.get("/api/health/exercise/week").get_json()
    running = next(item for item in week["distanceByModality"] if item["type"] == "Corrida")
    assert running["paceSecondsPerKm"] == 375
    assert running["totalMinutes"] == 110
    assert running["totalKm"] == 8
    assert running["averageSpeedKmh"] is None


def test_migration_preserves_legacy_rows_and_is_repeatable(app, exercise_client):
    entry = add(exercise_client, calories=140)
    with app.app_context():
        db = get_database()
        before = dict(db.execute("SELECT * FROM health_exercise_entries").fetchone())
        # Recreate the old daily uniqueness constraint without changing the row.
        db.execute("CREATE UNIQUE INDEX old_exercise_daily ON health_exercise_entries(profile_id, exercise_date)")
        db.commit()
        initialize_database()
        assert dict(db.execute("SELECT * FROM health_exercise_entries").fetchone()) == before
        backups = list(Path(app.config["DATABASE"]).parent.glob("assistant.pre-multi-exercise-*.sqlite3"))
        assert len(backups) == 1
        with sqlite3.connect(backups[0]) as backup:
            assert backup.execute("SELECT id, calories_burned FROM health_exercise_entries").fetchone() == (entry["id"], 140)
        initialize_database()
        assert len(list(Path(app.config["DATABASE"]).parent.glob("assistant.pre-multi-exercise-*.sqlite3"))) == 1
    second = add(exercise_client)
    assert second["id"] > entry["id"]
    assert exercise_client.get("/api/health/exercise/today").get_json()["activityCount"] == 2


def test_empty_legacy_migration_does_not_reuse_deleted_ids(app, exercise_client):
    entry = add(exercise_client)
    exercise_client.delete(f"/api/health/exercise/{entry['id']}")
    with app.app_context():
        db = get_database()
        db.execute("CREATE UNIQUE INDEX old_daily ON health_exercise_entries(profile_id, exercise_date)")
        db.commit()
        initialize_database()
    assert add(exercise_client)["id"] > entry["id"]
