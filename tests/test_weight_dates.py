from datetime import date, timedelta

import pytest

from app.core.database import get_database


@pytest.fixture()
def profile(client):
    client.post("/api/health/profile", json={"name": "Datas", "heightCm": 175, "weightKg": 80, "goals": ["Perder peso"], "targetWeightKg": 70})
    return client


def test_defaults_to_today_and_reports_date(profile):
    response = profile.post("/api/health/weight", json={"weightKg": 79})
    assert response.status_code == 201
    assert response.json["savedDate"] == date.today().isoformat()
    assert response.json["isToday"] is True


def test_past_weight_belongs_to_its_week_and_does_not_replace_latest(profile):
    profile.post("/api/health/weight", json={"weightKg": 78})
    prior = date.today() - timedelta(days=7)
    response = profile.post("/api/health/weight", json={"weightKg": 79, "recordedOn": prior.isoformat()})
    assert response.status_code == 201
    assert response.json["isToday"] is False
    assert response.json["savedDate"] == prior.isoformat()
    assert response.json["currentWeightKg"] == 78
    assert profile.get("/api/health/report/week?weekOffset=-1").json["weight"]["currentWeightKg"] == 79
    assert profile.get("/api/health/report/week").json["weight"]["currentWeightKg"] == 78


def test_historical_only_does_not_become_today_activity(profile):
    yesterday = (date.today() - timedelta(days=1)).isoformat()
    assert profile.post("/api/health/weight", json={"weightKg": 79, "recordedOn": yesterday}).status_code == 201
    assert profile.get("/api/health/latest-activity").json["activity"] is None


@pytest.mark.parametrize("offset", [0, 1, 30])
def test_duplicate_requires_explicit_edit_and_preserves_saved_value(profile, offset):
    day = (date.today() - timedelta(days=offset)).isoformat()
    profile.post("/api/health/weight", json={"weightKg": 79, "recordedOn": day})
    before = profile.get("/api/health/records").json
    conflict = profile.post("/api/health/weight", json={"weightKg": 70, "recordedOn": day})
    assert conflict.status_code == 409
    entry = conflict.json["entry"]
    assert entry["recordedOn"] == day
    assert entry["weightKg"] == 79
    assert profile.get("/api/health/records").json == before
    assert profile.put(f'/api/health/weight/{entry["id"]}', json={"weightKg": 78.5}).status_code == 200
    saved = profile.get("/api/health/records/backup").json["records"]["weight"]
    assert len(saved) == 1
    assert saved[0]["recorded_on"] == day
    assert saved[0]["weight_kg"] == 78.5


@pytest.mark.parametrize("day", ["", "2026-02-30", "2026-2-2", "20260202", "2026-W01-1", "tomorrow", True, [], 123, "9999-12-31"])
def test_invalid_or_future_dates_never_write(profile, day):
    before = profile.get("/api/health/records").json
    assert profile.post("/api/health/weight", json={"weightKg": 79, "recordedOn": day}).status_code == 400
    assert profile.get("/api/health/records").json == before


def test_leap_day_is_accepted_and_profile_baseline_is_not_a_duplicate(profile):
    response = profile.post("/api/health/weight", json={"weightKg": 79, "recordedOn": "2024-02-29"})
    assert response.status_code == 201
    assert response.json["savedDate"] == "2024-02-29"
    assert profile.post("/api/health/weight", json={"weightKg": 78, "recordedOn": date.today().isoformat()}).status_code == 201


def test_same_day_of_other_profile_is_not_a_conflict(profile):
    profile.post("/api/health/weight", json={"weightKg": 79})
    profile.post("/api/health/profile", json={"name": "Outro", "heightCm": 175, "weightKg": 85, "goals": ["Bem-estar geral"]})
    assert profile.post("/api/health/weight", json={"weightKg": 84}).status_code == 201
