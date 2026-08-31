from datetime import date, timedelta

import pytest

from app.core.database import get_database
from app.modules.health.weight_service import get_weight_chart


@pytest.fixture()
def chart_profile(client):
    client.post("/api/health/profile", json={"name": "Gráfico", "heightCm": 175, "weightKg": 80, "goals": ["Perder peso"], "targetWeightKg": 70})


def test_empty_chart_does_not_invent_profile_measurement(chart_profile, client):
    response = client.get("/api/health/weight/chart")
    assert response.status_code == 200
    assert response.json["points"] == []
    assert response.json["targetWeightKg"] == 70
    assert response.headers["Cache-Control"] == "no-store"


def test_exact_period_boundaries_and_complete_history(chart_profile, app):
    today = date(2026, 8, 31)
    with app.app_context():
        db = get_database()
        for offset in [*range(15), 29, 30, 89, 90, 365, -1]:
            db.execute("INSERT INTO health_weight_entries (profile_id, recorded_on, weight_kg) VALUES (1, ?, ?)", ((today - timedelta(days=offset)).isoformat(), 75 + offset / 100))
        db.commit()
        month = get_weight_chart("30", today)
        assert len(month["points"]) == 16
        assert month["startDate"] == "2026-08-02"
        assert month["endDate"] == "2026-08-31"
        assert month["points"][0]["recordedOn"] == "2026-08-02"
        assert len(get_weight_chart("90", today)["points"]) == 18
        all_points = get_weight_chart("all", today)
        assert len(all_points["points"]) == 20
        assert all_points["startDate"] == "2025-08-31"
        dates = [point["recordedOn"] for point in all_points["points"]]
        assert dates == sorted(dates)
        assert all(day <= str(today) for day in dates)


def test_chart_reflects_corrections_deletions_and_profile_scope(chart_profile, client):
    client.post("/api/health/weight", json={"weightKg": 79})
    point = client.get("/api/health/weight/chart?period=all").json["points"][0]
    client.put(f'/api/health/weight/{point["id"]}', json={"weightKg": 78})
    assert client.get("/api/health/weight/chart").json["points"][0]["weightKg"] == 78
    client.delete(f'/api/health/weight/{point["id"]}', json={"confirmed": True})
    assert client.get("/api/health/weight/chart").json["points"] == []
    client.post("/api/health/weight", json={"weightKg": 77})
    client.post("/api/health/profile", json={"name": "Outro", "heightCm": 170, "weightKg": 60, "goals": ["Ganhar peso"], "targetWeightKg": 65})
    result = client.get("/api/health/weight/chart").json
    assert result["points"] == []
    assert result["targetWeightKg"] == 65


@pytest.mark.parametrize("goal,target", [("Manter peso", 70), ("Perder peso, Ganhar peso", 70), ("Perder peso", "inválido"), ("Perder peso", 0)])
def test_no_line_for_missing_or_ambiguous_target(chart_profile, app, goal, target):
    with app.app_context():
        db = get_database()
        db.execute("UPDATE health_profiles SET goal = ?", (goal,))
        db.execute("UPDATE health_goals SET target_value = ?", (target,))
        db.commit()
        assert get_weight_chart()["targetWeightKg"] is None


def test_invalid_period_and_missing_profile(client):
    assert client.get("/api/health/weight/chart?period=7").status_code == 400
    assert client.get("/api/health/weight/chart").status_code == 400
