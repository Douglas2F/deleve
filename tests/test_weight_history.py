from datetime import date, timedelta

import pytest

from app.core.database import get_database


@pytest.fixture()
def weighings(client, app):
    client.post("/api/health/profile", json={"name": "Teste", "heightCm": 175, "weightKg": 80, "goals": ["Perder peso"], "targetWeightKg": 70})
    today = date.today()
    with app.app_context():
        db = get_database()
        db.execute("UPDATE health_profiles SET created_at = ?", (f"{today - timedelta(days=10)} 12:00:00",))
        db.executemany("INSERT INTO health_weight_entries (profile_id, recorded_on, weight_kg, created_at) VALUES (1, ?, ?, ?)", [
            (str(today - timedelta(days=1)), 79, f"{today - timedelta(days=1)} 12:00:00"),
            (str(today), 78, f"{today} 12:00:00"),
        ])
        db.commit()
    return client


def test_history_distinguishes_real_measurements_from_initial_profile(weighings):
    history = weighings.get("/api/health/weight").json["history"]
    assert [(row["id"], row["isInitial"]) for row in history] == [(2, False), (1, False), (None, True)]


def test_edit_preserves_date_timestamp_and_initial_profile(weighings, app):
    before = weighings.get("/api/health/records/backup").json
    response = weighings.put("/api/health/weight/1", json={"weightKg": "79,4"})
    assert response.status_code == 200
    assert response.json["currentWeightKg"] == 78
    after = weighings.get("/api/health/records/backup").json
    assert after["profile"] == before["profile"]
    assert after["goals"] == before["goals"]
    original = before["records"]["weight"][0]
    assert after["records"]["weight"][0] == {**original, "weight_kg": 79.4}
    assert after["records"]["weight"][1] == before["records"]["weight"][1]


def test_edit_latest_updates_summary_and_weekly_report(weighings):
    response = weighings.put("/api/health/weight/2", json={"weightKg": 77.5})
    assert response.json["currentWeightKg"] == 77.5
    assert response.json["changeKg"] == -2.5
    assert weighings.get("/api/health/report/week").json["weight"]["currentWeightKg"] == 77.5


def test_delete_requires_confirmation_and_reverts_to_previous_then_baseline(weighings):
    assert weighings.delete("/api/health/weight/2", json={}).status_code == 400
    assert weighings.delete("/api/health/weight/2", json={"confirmed": "true"}).status_code == 400
    result = weighings.delete("/api/health/weight/2", json={"confirmed": True})
    assert result.status_code == 200
    assert result.json["currentWeightKg"] == 79
    assert weighings.get("/api/health/latest-activity").json["activity"] is None
    result = weighings.delete("/api/health/weight/1", json={"confirmed": True})
    assert result.json["currentWeightKg"] == 80
    assert result.json["changeKg"] == 0
    assert len(result.json["history"]) == 1
    assert result.json["history"][0]["isInitial"] is True
    assert weighings.get("/api/health/report/week").json["weight"]["recordedDays"] == 0
    assert weighings.delete("/api/health/weight/1", json={"confirmed": True}).status_code == 404


@pytest.mark.parametrize("value", [None, "", "abc", "nan", "inf", 19, 401, True, {}])
def test_invalid_weight_does_not_modify_anything(weighings, value):
    before = weighings.get("/api/health/records").json
    assert weighings.put("/api/health/weight/2", json={"weightKg": value}).status_code == 400
    assert weighings.get("/api/health/records").json == before


def test_unknown_entry_never_inserts_and_wrong_profile_is_protected(weighings):
    assert weighings.put("/api/health/weight/999", json={"weightKg": 75}).status_code == 404
    assert weighings.put("/api/health/weight/2", json=[]).status_code == 400
    assert weighings.delete("/api/health/weight/2").status_code == 400
    weighings.post("/api/health/profile", json={"name": "Outro perfil", "heightCm": 170, "weightKg": 70, "goals": ["Bem-estar geral"]})
    assert weighings.put("/api/health/weight/2", json={"weightKg": 75}).status_code == 404
    assert weighings.delete("/api/health/weight/2", json={"confirmed": True}).status_code == 404


def test_real_weighing_on_profile_date_can_be_deleted_without_deleting_baseline(weighings, app):
    with app.app_context():
        db = get_database()
        db.execute("UPDATE health_profiles SET created_at = ?", (f"{date.today()} 12:00:00",))
        db.commit()
    result = weighings.delete("/api/health/weight/2", json={"confirmed": True}).json
    baseline = next(row for row in result["history"] if row["isInitial"])
    assert baseline["id"] is None
    assert baseline["weightKg"] == 80
    assert result["currentWeightKg"] == 79


def test_no_profile_cannot_change_weight(client):
    assert client.put("/api/health/weight/1", json={"weightKg": 75}).status_code == 400
