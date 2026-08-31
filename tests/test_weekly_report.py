from datetime import date, timedelta

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


def test_previous_comparison_matches_weekdays_and_uses_daily_totals(report_app):
    with report_app.app_context():
        db = get_database()
        db.executemany("INSERT INTO health_water_entries (profile_id, amount_ml, recorded_at) VALUES (1, ?, ?)", [
            (1000, "2026-08-17 12:00:00"), (1000, "2026-08-17 13:00:00"),
            (500, "2026-08-19 12:00:00"), (2000, "2026-08-20 12:00:00"),
            (2000, "2026-08-24 12:00:00"), (2000, "2026-08-26 12:00:00"),
            (2000, "2026-08-27 12:00:00"),
        ])
        db.executemany("INSERT INTO health_sleep_entries (profile_id, sleep_date, bedtime, wake_time, duration_minutes) VALUES (1, ?, '23:00', '07:00', ?)", [
            ("2026-08-17", 480), ("2026-08-19", 480), ("2026-08-20", 480),
            ("2026-08-24", 420), ("2026-08-26", 480),
        ])
        db.executemany("INSERT INTO health_exercise_entries (profile_id, exercise_date, exercise_type, duration_minutes) VALUES (1, ?, 'Ciclismo', 20)",
                       [("2026-08-17",), ("2026-08-17",), ("2026-08-20",), ("2026-08-24",), ("2026-08-26",)])
        db.commit()
        result = get_weekly_health_report(date(2026, 8, 26))["previousComparison"]
    assert result["startDate"] == "2026-08-17"
    assert result["endDate"] == "2026-08-19"
    assert result["water"] == {"available": True, "current": 2, "previous": 1, "difference": 1}
    assert result["sleep"]["difference"] == -1
    assert result["exercise"] == {"available": True, "current": 2, "previous": 1, "difference": 1}


@pytest.mark.parametrize("current_date,previous_end", [(date(2026, 8, 24), "2026-08-17"), (date(2026, 8, 30), "2026-08-23"), (date(2027, 1, 1), "2026-12-25")])
def test_comparison_dates_and_empty_periods(report_app, current_date, previous_end):
    with report_app.app_context():
        result = get_weekly_health_report(current_date)["previousComparison"]
    assert result["endDate"] == previous_end
    for area in ["water", "sleep", "exercise", "weight"]:
        assert result[area]["available"] is False
        assert result[area]["difference"] is None


@pytest.mark.parametrize("goal,direction", [("Perder peso", -1), ("Ganhar peso", 1), ("Manter peso", 0), ("Perder peso, Ganhar peso", 0)])
def test_weight_comparison_uses_last_real_measurements_and_current_objective(report_app, goal, direction):
    with report_app.app_context():
        db = get_database()
        db.execute("UPDATE health_profiles SET goal = ? WHERE id = 1", (goal,))
        db.executemany("INSERT INTO health_weight_entries (profile_id, recorded_on, weight_kg) VALUES (1, ?, ?)", [
            ("2026-08-17", 82), ("2026-08-19", 80), ("2026-08-20", 70),
            ("2026-08-24", 79.8), ("2026-08-26", 79.4), ("2026-08-27", 60),
        ])
        db.commit()
        result = get_weekly_health_report(date(2026, 8, 26))["previousComparison"]["weight"]
    assert result == {"available": True, "difference": -0.6, "currentDate": "2026-08-26", "previousDate": "2026-08-19", "goalDirection": direction}


def test_historical_comparison_uses_full_previous_week_and_same_goals(report_app):
    with report_app.app_context():
        db = get_database()
        db.executemany("INSERT INTO health_water_entries (profile_id, amount_ml, recorded_at) VALUES (1, ?, ?)", [
            (1500, "2026-08-23 12:00:00"), (1500, "2026-08-30 12:00:00"),
        ])
        db.execute("UPDATE health_profiles SET water_goal_ml = 1500 WHERE id = 1")
        db.commit()
        result = get_weekly_health_report(date(2026, 8, 31), -1)["previousComparison"]
        assert result["endDate"] == "2026-08-23"
        assert result["water"] == {"available": True, "current": 1, "previous": 1, "difference": 0}
        db.execute("UPDATE health_profiles SET water_goal_ml = 0 WHERE id = 1")
        assert get_weekly_health_report(date(2026, 8, 31), -1)["previousComparison"]["water"]["available"] is False


def test_one_sided_records_do_not_imply_a_decline_or_use_profile_weight(report_app):
    with report_app.app_context():
        db = get_database()
        db.execute("INSERT INTO health_water_entries (profile_id, amount_ml, recorded_at) VALUES (1, 2000, '2026-08-17 12:00:00')")
        db.execute("INSERT INTO health_weight_entries (profile_id, recorded_on, weight_kg) VALUES (1, '2026-08-17', 81)")
        db.commit()
        result = get_weekly_health_report(date(2026, 8, 24))["previousComparison"]
        assert result["water"]["difference"] is None
        assert result["weight"]["difference"] is None
        db.execute("DELETE FROM health_water_entries")
        db.execute("INSERT INTO health_water_entries (profile_id, amount_ml, recorded_at) VALUES (1, 2000, '2026-08-24 12:00:00')")
        assert get_weekly_health_report(date(2026, 8, 24))["previousComparison"]["water"]["difference"] is None


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


def test_previous_week_includes_sunday_and_excludes_current_week(report_app):
    with report_app.app_context():
        db = get_database()
        db.executemany(
            "INSERT INTO health_water_entries (profile_id, amount_ml, recorded_at) VALUES (1, ?, ?)",
            [(700, "2026-08-24 12:00:00"), (1400, "2026-08-30 12:00:00"),
             (9999, "2026-08-31 12:00:00"), (9999, "2026-08-23 12:00:00")],
        )
        db.executemany(
            "INSERT INTO health_sleep_entries (profile_id, sleep_date, bedtime, wake_time, duration_minutes) VALUES (1, ?, '23:00', '07:00', ?)",
            [("2026-08-30", 480), ("2026-08-31", 600)],
        )
        db.executemany(
            "INSERT INTO health_weight_entries (profile_id, recorded_on, weight_kg) VALUES (1, ?, ?)",
            [("2026-08-24", 80), ("2026-08-30", 79), ("2026-08-31", 78)],
        )
        db.commit()
        report = get_weekly_health_report(date(2026, 8, 31), week_offset=-1)
    assert (report["startDate"], report["endDate"]) == ("2026-08-24", "2026-08-30")
    assert report["referenceDate"] == "2026-08-30"
    assert report["elapsedDays"] == 7
    assert report["isCurrentWeek"] is False
    assert report["weekOffset"] == -1
    assert report["water"]["totalMl"] == 2100
    assert report["water"]["averageMl"] == 300
    assert report["sleep"]["averageMinutes"] == 480
    assert report["weight"]["currentWeightKg"] == 79
    assert report["weight"]["weeklyChangeKg"] == -1
    assert not any(day["isFuture"] for day in report["water"]["days"])


@pytest.mark.parametrize("today,offset,start,end", [
    (date(2026, 1, 5), -1, "2025-12-29", "2026-01-04"),
    (date(2024, 3, 4), -1, "2024-02-26", "2024-03-03"),
    (date(2026, 8, 31), -2, "2026-08-17", "2026-08-23"),
])
def test_week_navigation_handles_month_year_and_leap_boundaries(report_app, today, offset, start, end):
    with report_app.app_context():
        report = get_weekly_health_report(today, week_offset=offset)
    assert report["startDate"] == start
    assert report["endDate"] == end
    assert report["elapsedDays"] == 7
    assert report["recordedAreas"] == 0
    assert report["weight"]["currentWeightKg"] is None


@pytest.mark.parametrize("offset", ["1", "2", "abc", "-1.5", "", "-99999999999999999999999"])
def test_week_api_rejects_future_or_invalid_offsets(report_app, client, offset):
    response = client.get("/api/health/report/week", query_string={"weekOffset": offset})
    assert response.status_code == 400
    assert "error" in response.json


def test_week_api_defaults_to_current_and_accepts_previous_week(report_app, client):
    current = client.get("/api/health/report/week").json
    previous = client.get("/api/health/report/week?weekOffset=-1").json
    assert current["isCurrentWeek"] is True
    assert current["weekOffset"] == 0
    assert previous["elapsedDays"] == 7
    assert date.fromisoformat(previous["startDate"]) == date.fromisoformat(current["startDate"]) - timedelta(days=7)


def test_historical_exercises_keep_all_modalities_and_seconds_in_selected_week(report_app):
    with report_app.app_context():
        db = get_database()
        db.executemany(
            """INSERT INTO health_exercise_entries
               (profile_id, exercise_date, exercise_type, duration_minutes, duration_seconds, distance_km)
               VALUES (1, ?, ?, ?, ?, ?)""",
            [("2026-08-30", "Ciclismo", 20, 1200, 5),
             ("2026-08-30", "Musculação", 61, 3606, None),
             ("2026-08-31", "Corrida", 30, 1800, 4)],
        )
        db.commit()
        exercise = get_weekly_health_report(date(2026, 8, 31), week_offset=-1)["exercise"]
    assert exercise["activityCount"] == 2
    assert exercise["completedDays"] == 1
    assert exercise["totalSeconds"] == 4806
    assert set(exercise["modalities"]) == {"Ciclismo", "Musculação"}
    assert len(exercise["days"]) == 7
    sunday = exercise["days"][-1]
    assert sunday["date"] == "2026-08-30"
    assert sunday["activityCount"] == 2
    assert sunday["totalSeconds"] == 4806
    assert [entry["type"] for entry in sunday["entries"]] == ["Ciclismo", "Musculação"]
    assert not any(day["isFuture"] for day in exercise["days"])


def test_daily_exercises_keep_repeated_modalities_and_their_own_metrics(report_app):
    with report_app.app_context():
        db = get_database()
        db.executemany(
            """INSERT INTO health_exercise_entries
               (profile_id, exercise_date, exercise_type, duration_minutes, duration_seconds,
                distance_km, calories_burned, calorie_source, created_at)
               VALUES (1, '2026-08-26', ?, ?, ?, ?, ?, ?, ?)""",
            [("Ciclismo", 20, 1200, 5, 120, "manual", "2026-08-26 08:00:00"),
             ("Musculação", 61, 3606, None, 400, "estimated", "2026-08-26 12:00:00"),
             ("Ciclismo", 30, 1800, 5, None, None, "2026-08-26 18:00:00")],
        )
        db.commit()
        exercise = get_weekly_health_report(date(2026, 8, 26))["exercise"]
    day = exercise["days"][2]
    assert day["activityCount"] == 3
    assert day["totalSeconds"] == exercise["totalSeconds"] == 6606
    first, gym, last = day["entries"]
    assert len({entry["id"] for entry in day["entries"]}) == 3
    assert first["averageSpeedKmh"] == 15
    assert last["averageSpeedKmh"] == 10
    assert first["paceSecondsPerKm"] is None
    assert gym["distanceKm"] is None
    assert gym["paceSecondsPerKm"] is None
    assert gym["averageSpeedKmh"] is None
    assert gym["durationSeconds"] == 3606
    assert first["calorieSource"] == "manual"
    assert gym["calorieSource"] == "estimated"
    assert last["caloriesBurned"] is None
    assert [item["isFuture"] for item in exercise["days"]] == [False, False, False, True, True, True, True]
    assert all(not item["entries"] and item["activityCount"] == 0 for item in exercise["days"] if item["date"] != day["date"])


def test_daily_exercise_api_includes_seven_days_and_ignores_future_records(report_app, client):
    with report_app.app_context():
        db = get_database()
        tomorrow = date.today() + timedelta(days=1)
        db.execute("""INSERT INTO health_exercise_entries
                   (profile_id, exercise_date, exercise_type, duration_minutes, duration_seconds)
                   VALUES (1, ?, 'Corrida', 30, 1800)""", (tomorrow.isoformat(),))
        db.commit()
    response = client.get("/api/health/report/week")
    days = response.json["exercise"]["days"]
    assert response.status_code == 200
    assert len(days) == 7
    assert all(not item["entries"] and item["activityCount"] == 0 for item in days)
    assert sum(item["isFuture"] for item in days) == 6 - date.today().weekday()
