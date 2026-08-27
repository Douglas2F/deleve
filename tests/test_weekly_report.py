from datetime import date

import pytest

from app.core.database import get_database, initialize_database
from app.modules.health.weekly_report_service import get_weekly_health_report


@pytest.fixture()
def report_app(app, client):
    with app.app_context():
        initialize_database()
    client.post("/api/health/profile", json={
        "name": "Teste", "heightCm": "175", "weightKg": "80",
        "goals": ["Beber mais água", "Dormir melhor"],
        "waterGoalMl": "2000", "sleepGoalHours": "8",
    })
    return app


@pytest.mark.parametrize("day,elapsed", [(24, 1), (26, 3), (30, 7)])
def test_empty_report_has_seven_days_without_inventing_records(report_app, day, elapsed):
    with report_app.app_context():
        report = get_weekly_health_report(date(2026, 8, day))
    assert report["elapsedDays"] == elapsed
    assert report["recordedAreas"] == 0
    assert report["referenceDate"] == f"2026-08-{day}"
    for area in ["water", "sleep"]:
        days = report[area]["days"]
        assert len(days) == 7
        assert days[0]["date"] == "2026-08-24"
        assert days[-1]["date"] == "2026-08-30"
        assert sum(not day["isFuture"] for day in days) == elapsed
        assert all(day["value"] is None and not day["goalReached"] for day in days)
    assert report["weight"]["comparisonAvailable"] is False
    assert report["weight"]["initialWeightKg"] is None
    assert report["weight"]["latestDate"] is None


def test_daily_totals_goals_and_averages_ignore_future_and_previous_week(report_app):
    with report_app.app_context():
        db = get_database()
        # Noon stays on the intended day in the application's local timezone.
        db.executemany(
            "INSERT INTO health_water_entries (profile_id, amount_ml, recorded_at) VALUES (1, ?, ?)",
            [(1000, "2026-08-24 12:00:00"), (1000, "2026-08-24 13:00:00"),
             (500, "2026-08-26 12:00:00"), (3000, "2026-08-27 12:00:00"),
             (3000, "2026-08-23 12:00:00")],
        )
        db.executemany(
            "INSERT INTO health_sleep_entries (profile_id, sleep_date, bedtime, wake_time, duration_minutes) VALUES (1, ?, '23:00', '07:00', ?)",
            [("2026-08-24", 480), ("2026-08-26", 420), ("2026-08-27", 600)],
        )
        db.commit()
        report = get_weekly_health_report(date(2026, 8, 26))
    assert report["water"]["totalMl"] == 2500
    assert report["water"]["averageMl"] == 833
    assert report["water"]["recordedDays"] == 2
    assert report["water"]["goalDays"] == 1
    assert report["water"]["days"][0]["goalReached"] is True
    assert report["water"]["days"][1]["value"] is None
    assert report["water"]["days"][2]["value"] == 500
    assert report["water"]["days"][3]["value"] is None
    assert report["sleep"]["averageMinutes"] == 450
    assert report["sleep"]["recordedDays"] == 2
    assert report["sleep"]["goalDays"] == 1
    assert report["sleep"]["days"][0]["goalReached"] is True
    assert report["sleep"]["days"][2]["goalReached"] is False
    assert report["sleep"]["days"][3]["value"] is None
    assert report["recordedAreas"] == 2


@pytest.mark.parametrize("last_weight,change", [(79.5, -0.5), (80, 0), (80.5, 0.5)])
def test_weight_compares_first_and_last_actual_weekly_readings(report_app, last_weight, change):
    with report_app.app_context():
        db = get_database()
        db.executemany(
            "INSERT INTO health_weight_entries (profile_id, recorded_on, weight_kg) VALUES (1, ?, ?)",
            [("2026-08-23", 81), ("2026-08-25", 80), ("2026-08-26", last_weight), ("2026-08-27", 78)],
        )
        db.commit()
        weight = get_weekly_health_report(date(2026, 8, 26))["weight"]
    assert weight["recordedDays"] == 2
    assert weight["comparisonAvailable"] is True
    assert weight["initialWeightKg"] == 80
    assert weight["currentWeightKg"] == last_weight
    assert weight["weeklyChangeKg"] == change
    assert weight["initialDate"] == "2026-08-25"
    assert weight["latestDate"] == "2026-08-26"


def test_single_weighing_is_not_a_comparison(report_app):
    with report_app.app_context():
        db = get_database()
        db.execute("INSERT INTO health_weight_entries (profile_id, recorded_on, weight_kg) VALUES (1, '2026-08-26', 79)")
        db.commit()
        weight = get_weekly_health_report(date(2026, 8, 26))["weight"]
    assert weight["recordedDays"] == 1
    assert weight["currentWeightKg"] == 79
    assert weight["comparisonAvailable"] is False
    assert weight["initialDate"] == weight["latestDate"]
