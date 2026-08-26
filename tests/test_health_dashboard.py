def test_health_dashboard_loads(client):
    response = client.get("/")

    assert response.status_code == 200
    assert "Módulo Saúde" in response.text
    assert "Começar configuração" in response.text

def test_create_health_profile(app, client):
    from app.core.database import initialize_database
    with app.app_context(): initialize_database()
    response = client.post("/api/health/profile", json={"name":"Douglas","heightCm":"175","weightKg":"78","goals":["Bem-estar geral","Beber mais água"],"sleepGoalHours":"","waterGoalMl":"2000"})
    assert response.status_code == 201
    profile_response = client.get("/api/health/profile")
    assert profile_response.status_code == 200
    assert profile_response.get_json()["name"] == "Douglas"


def test_updates_profile_and_goals_without_replacing_profile(app, client):
    from app.core.database import get_database, initialize_database

    with app.app_context():
        initialize_database()
    client.post(
        "/api/health/profile",
        json={"name": "Douglas", "heightCm": "175", "weightKg": "78", "goals": ["Beber mais água"], "waterGoalMl": "2000"},
    )

    response = client.put(
        "/api/health/profile",
        json={"name": "Doug", "heightCm": "176", "goals": ["Dormir melhor", "Praticar atividade física"], "sleepGoalHours": "7", "exerciseDaysWeek": "4"},
    )

    assert response.status_code == 200
    assert response.get_json()["name"] == "Doug"
    assert response.get_json()["exerciseDaysWeek"] == 4
    with app.app_context():
        assert get_database().execute("SELECT COUNT(*) AS total FROM health_profiles").fetchone()["total"] == 1


def test_registers_and_sums_today_water(app, client):
    from app.core.database import initialize_database

    with app.app_context():
        initialize_database()
    client.post(
        "/api/health/profile",
        json={"name": "Douglas", "heightCm": "175", "weightKg": "78", "goals": ["Beber mais água"], "waterGoalMl": "2000"},
    )

    first = client.post("/api/health/water", json={"amountMl": 250})
    second = client.post("/api/health/water", json={"amountMl": 300})
    today = client.get("/api/health/water/today")

    assert first.status_code == 201
    assert first.get_json()["totalMl"] == 250
    assert second.get_json()["totalMl"] == 550
    assert today.get_json()["totalMl"] == 550


def test_rejects_invalid_water_amount(app, client):
    from app.core.database import initialize_database

    with app.app_context():
        initialize_database()
    response = client.post("/api/health/water", json={"amountMl": 0})

    assert response.status_code == 400
    assert "entre 50 e 2000 ml" in response.get_json()["error"]


def test_removes_only_latest_water_entry(app, client):
    from app.core.database import initialize_database

    with app.app_context():
        initialize_database()
    client.post(
        "/api/health/profile",
        json={"name": "Douglas", "heightCm": "175", "weightKg": "78", "goals": ["Beber mais água"], "waterGoalMl": "2000"},
    )
    client.post("/api/health/water", json={"amountMl": 250})
    client.post("/api/health/water", json={"amountMl": 300})

    response = client.delete("/api/health/water/latest")

    assert response.status_code == 200
    assert response.get_json()["removedAmountMl"] == 300
    assert response.get_json()["totalMl"] == 250


def test_rejects_water_undo_when_day_is_empty(app, client):
    from app.core.database import initialize_database

    with app.app_context():
        initialize_database()
    client.post(
        "/api/health/profile",
        json={"name": "Douglas", "heightCm": "175", "weightKg": "78", "goals": ["Bem-estar geral"]},
    )

    response = client.delete("/api/health/water/latest")

    assert response.status_code == 400
    assert "Não há registro de água" in response.get_json()["error"]


def test_weekly_water_average_uses_only_elapsed_days(app, client):
    from datetime import date

    from app.core.database import initialize_database

    with app.app_context():
        initialize_database()
    client.post(
        "/api/health/profile",
        json={"name": "Douglas", "heightCm": "175", "weightKg": "78", "goals": ["Beber mais água"], "waterGoalMl": "2000"},
    )
    client.post("/api/health/water", json={"amountMl": 1000})

    response = client.get("/api/health/water/week")
    body = response.get_json()
    elapsed_days = date.today().weekday() + 1

    assert response.status_code == 200
    assert body["elapsedDays"] == elapsed_days
    assert body["totalMl"] == 1000
    assert body["averageMl"] == round(1000 / elapsed_days)
    assert len(body["days"]) == 7


def test_registers_water_on_previous_day_of_current_week(app, client):
    from datetime import date, timedelta

    from app.core.database import initialize_database

    with app.app_context():
        initialize_database()
    client.post(
        "/api/health/profile",
        json={"name": "Douglas", "heightCm": "175", "weightKg": "78", "goals": ["Beber mais água"], "waterGoalMl": "2000"},
    )
    today = date.today()
    previous_day = today - timedelta(days=1)
    if previous_day < today - timedelta(days=today.weekday()):
        return

    response = client.post(
        "/api/health/water",
        json={"amountMl": 500, "waterDate": previous_day.isoformat()},
    )
    week = client.get("/api/health/water/week").get_json()
    saved_day = next(day for day in week["days"] if day["date"] == previous_day.isoformat())

    assert response.status_code == 201
    assert response.get_json()["waterDate"] == previous_day.isoformat()
    assert response.get_json()["totalMl"] == 500
    assert saved_day["totalMl"] == 500


def test_rejects_water_on_future_date(app, client):
    from datetime import date, timedelta

    from app.core.database import initialize_database

    with app.app_context():
        initialize_database()
    client.post(
        "/api/health/profile",
        json={"name": "Douglas", "heightCm": "175", "weightKg": "78", "goals": ["Beber mais água"], "waterGoalMl": "2000"},
    )

    response = client.post(
        "/api/health/water",
        json={"amountMl": 250, "waterDate": (date.today() + timedelta(days=1)).isoformat()},
    )

    assert response.status_code == 400
    assert "data futura" in response.get_json()["error"]


def test_registers_overnight_sleep(app, client):
    from app.core.database import initialize_database

    with app.app_context():
        initialize_database()
    client.post(
        "/api/health/profile",
        json={"name": "Douglas", "heightCm": "175", "weightKg": "78", "goals": ["Dormir melhor"], "sleepGoalHours": "8"},
    )

    response = client.post(
        "/api/health/sleep",
        json={"bedtime": "23:00", "wakeTime": "07:00"},
    )
    today = client.get("/api/health/sleep/today")

    assert response.status_code == 201
    assert response.get_json()["durationMinutes"] == 480
    assert today.get_json()["entry"]["bedtime"] == "23:00"


def test_rejects_unreasonable_sleep_duration(app, client):
    from app.core.database import initialize_database

    with app.app_context():
        initialize_database()
    response = client.post(
        "/api/health/sleep",
        json={"bedtime": "07:00", "wakeTime": "06:00"},
    )

    assert response.status_code == 400
    assert "entre 1 e 16 horas" in response.get_json()["error"]


def test_returns_weekly_sleep_summary(app, client):
    from app.core.database import initialize_database

    with app.app_context():
        initialize_database()
    client.post(
        "/api/health/profile",
        json={"name": "Douglas", "heightCm": "175", "weightKg": "78", "goals": ["Dormir melhor"], "sleepGoalHours": "8"},
    )
    client.post("/api/health/sleep", json={"bedtime": "23:00", "wakeTime": "07:00"})

    response = client.get("/api/health/sleep/week")
    body = response.get_json()

    assert response.status_code == 200
    assert len(body["days"]) == 7
    assert body["completedDays"] == 1
    assert body["averageMinutes"] == 480
    assert body["goalDays"] == 1


def test_registers_and_deletes_sleep_on_previous_day(app, client):
    from datetime import date, timedelta

    from app.core.database import initialize_database

    if date.today().weekday() == 0:
        return
    with app.app_context():
        initialize_database()
    client.post(
        "/api/health/profile",
        json={"name": "Douglas", "heightCm": "175", "weightKg": "78", "goals": ["Dormir melhor"], "sleepGoalHours": "8"},
    )
    previous_day = (date.today() - timedelta(days=1)).isoformat()
    saved = client.post(
        "/api/health/sleep",
        json={"bedtime": "22:30", "wakeTime": "06:30", "sleepDate": previous_day},
    )
    deleted = client.delete(f"/api/health/sleep/{previous_day}")

    assert saved.status_code == 201
    assert saved.get_json()["date"] == previous_day
    assert deleted.status_code == 200
    assert deleted.get_json()["week"]["completedDays"] == 0


def test_rejects_future_sleep_date(app, client):
    from datetime import date, timedelta

    from app.core.database import initialize_database

    with app.app_context():
        initialize_database()
    client.post(
        "/api/health/profile",
        json={"name": "Douglas", "heightCm": "175", "weightKg": "78", "goals": ["Dormir melhor"], "sleepGoalHours": "8"},
    )

    response = client.post(
        "/api/health/sleep",
        json={"bedtime": "23:00", "wakeTime": "07:00", "sleepDate": (date.today() + timedelta(days=1)).isoformat()},
    )

    assert response.status_code == 400
    assert "data futura" in response.get_json()["error"]


def test_registers_today_exercise(app, client):
    from app.core.database import initialize_database

    with app.app_context():
        initialize_database()
    client.post(
        "/api/health/profile",
        json={"name": "Douglas", "heightCm": "175", "weightKg": "78", "goals": ["Praticar atividade física"]},
    )

    response = client.post(
        "/api/health/exercise",
        json={"type": "Dança", "durationMinutes": 35, "note": "Em casa"},
    )
    today = client.get("/api/health/exercise/today")

    assert response.status_code == 201
    assert response.get_json()["durationMinutes"] == 35
    assert today.get_json()["entry"]["type"] == "Dança"
    assert today.get_json()["entry"]["note"] == "Em casa"


def test_returns_weekly_exercise_summary(app, client):
    from datetime import date, timedelta

    from app.core.database import get_database, initialize_database

    with app.app_context():
        initialize_database()
    client.post(
        "/api/health/profile",
        json={"name": "Douglas", "heightCm": "175", "weightKg": "78", "goals": ["Praticar atividade física"], "exerciseDaysWeek": "3"},
    )
    client.post(
        "/api/health/exercise",
        json={"type": "Musculação", "durationMinutes": 60},
    )
    with app.app_context():
        database = get_database()
        profile_id = database.execute("SELECT id FROM health_profiles ORDER BY id DESC LIMIT 1").fetchone()["id"]
        monday = date.today() - timedelta(days=date.today().weekday())
        if monday != date.today():
            database.execute(
                "INSERT INTO health_exercise_entries (profile_id, exercise_date, exercise_type, duration_minutes) VALUES (?, ?, ?, ?)",
                (profile_id, monday.isoformat(), "Caminhada", 30),
            )
            database.commit()

    response = client.get("/api/health/exercise/week")
    body = response.get_json()

    assert response.status_code == 200
    assert len(body["days"]) == 7
    assert body["targetDays"] == 3
    assert body["completedDays"] >= 1
    assert body["totalMinutes"] >= 60
    assert any(day["isToday"] and day["hasExercise"] for day in body["days"])


def test_weekly_exercise_summary_sums_duration(app, client):
    from app.core.database import initialize_database

    with app.app_context():
        initialize_database()
    client.post(
        "/api/health/profile",
        json={"name": "Douglas", "heightCm": "175", "weightKg": "78", "goals": ["Praticar atividade física"], "exerciseDaysWeek": "3"},
    )
    client.post(
        "/api/health/exercise",
        json={"type": "Dança", "durationMinutes": 90},
    )

    response = client.get("/api/health/exercise/week")

    assert response.status_code == 200
    assert response.get_json()["totalMinutes"] == 90


def test_registers_optional_distance_for_running(app, client):
    from app.core.database import initialize_database

    with app.app_context():
        initialize_database()
    client.post(
        "/api/health/profile",
        json={"name": "Douglas", "heightCm": "175", "weightKg": "78", "goals": ["Praticar atividade física"], "exerciseDaysWeek": "3"},
    )

    response = client.post(
        "/api/health/exercise",
        json={"type": "Corrida", "durationMinutes": 35, "distanceKm": "5,4"},
    )
    today = client.get("/api/health/exercise/today").get_json()["entry"]
    week = client.get("/api/health/exercise/week").get_json()

    assert response.status_code == 201
    assert response.get_json()["distanceKm"] == 5.4
    assert response.get_json()["paceSecondsPerKm"] == 389
    assert today["distanceKm"] == 5.4
    assert today["paceSecondsPerKm"] == 389
    assert week["distanceByModality"][0]["type"] == "Corrida"
    assert week["distanceByModality"][0]["totalKm"] == 5.4
    assert week["distanceByModality"][0]["paceSecondsPerKm"] == 389


def test_registers_optional_active_calories_for_exercise(app, client):
    from app.core.database import initialize_database

    with app.app_context():
        initialize_database()
    client.post(
        "/api/health/profile",
        json={"name": "Douglas", "heightCm": "175", "weightKg": "78", "goals": ["Praticar atividade física"]},
    )

    response = client.post(
        "/api/health/exercise",
        json={"type": "Corrida", "durationMinutes": 30, "distanceKm": "5", "caloriesBurned": "420"},
    )
    today = client.get("/api/health/exercise/today").get_json()["entry"]
    week = client.get("/api/health/exercise/week").get_json()

    assert response.status_code == 201
    assert response.get_json()["caloriesBurned"] == 420
    assert today["caloriesBurned"] == 420
    assert week["totalCalories"] == 420


def test_latest_activity_returns_a_health_record(app, client):
    from app.core.database import initialize_database

    with app.app_context():
        initialize_database()
    client.post(
        "/api/health/profile",
        json={"name": "Douglas", "heightCm": "175", "weightKg": "78", "goals": ["Praticar atividade física"]},
    )
    client.post("/api/health/water", json={"amountMl": 250})

    activity = client.get("/api/health/latest-activity").get_json()["activity"]

    assert activity["kind"] == "water"
    assert activity["recordedAt"]


def test_daily_focus_can_be_saved_completed_and_removed(app, client):
    from app.core.database import initialize_database

    with app.app_context():
        initialize_database()
    client.post(
        "/api/health/profile",
        json={"name": "Douglas", "heightCm": "175", "weightKg": "78", "goals": ["Bem-estar geral"]},
    )

    saved = client.post("/api/health/focus/today", json={"text": "  Ir à academia  "})
    completed = client.patch("/api/health/focus/today", json={"completed": True})
    current = client.get("/api/health/focus/today").get_json()["focus"]
    removed = client.delete("/api/health/focus/today")

    assert saved.status_code == 201
    assert saved.get_json() == {"text": "Ir à academia", "completed": False}
    assert completed.get_json()["completed"] is True
    assert current["completed"] is True
    assert removed.get_json()["deleted"] is True
    assert client.get("/api/health/focus/today").get_json()["focus"] is None


def test_rejects_invalid_active_calories(app, client):
    from app.core.database import initialize_database

    with app.app_context():
        initialize_database()
    client.post(
        "/api/health/profile",
        json={"name": "Douglas", "heightCm": "175", "weightKg": "78", "goals": ["Praticar atividade física"]},
    )

    response = client.post(
        "/api/health/exercise",
        json={"type": "Corrida", "durationMinutes": 30, "caloriesBurned": 0},
    )

    assert response.status_code == 400
    assert "calorias" in response.get_json()["error"].lower()


def test_weekly_distance_is_summed_separately_by_modality(app, client):
    from datetime import date

    from app.core.database import get_database, initialize_database
    from app.modules.health.exercise_service import get_weekly_exercise_summary

    with app.app_context():
        initialize_database()
    client.post(
        "/api/health/profile",
        json={"name": "Douglas", "heightCm": "175", "weightKg": "78", "goals": ["Praticar atividade física"], "exerciseDaysWeek": "3"},
    )
    with app.app_context():
        database = get_database()
        profile_id = database.execute("SELECT id FROM health_profiles ORDER BY id DESC LIMIT 1").fetchone()["id"]
        database.executemany(
            """
            INSERT INTO health_exercise_entries
                (profile_id, exercise_date, exercise_type, duration_minutes, distance_km)
            VALUES (?, ?, ?, ?, ?)
            """,
            [
                (profile_id, "2026-08-24", "Corrida", 30, 5.0),
                (profile_id, "2026-08-25", "Ciclismo", 60, 18.5),
                (profile_id, "2026-08-26", "Corrida", 25, 3.2),
            ],
        )
        database.commit()
        week = get_weekly_exercise_summary(date(2026, 8, 26))

    totals = {item["type"]: item["totalKm"] for item in week["distanceByModality"]}
    performance = {item["type"]: item for item in week["distanceByModality"]}
    assert totals == {"Corrida": 8.2, "Ciclismo": 18.5}
    assert performance["Corrida"]["paceSecondsPerKm"] == 402
    assert performance["Ciclismo"]["averageSpeedKmh"] == 18.5


def test_rejects_distance_for_modality_without_distance(app, client):
    from app.core.database import initialize_database

    with app.app_context():
        initialize_database()
    client.post(
        "/api/health/profile",
        json={"name": "Douglas", "heightCm": "175", "weightKg": "78", "goals": ["Praticar atividade física"], "exerciseDaysWeek": "3"},
    )

    response = client.post(
        "/api/health/exercise",
        json={"type": "Musculação", "durationMinutes": 45, "distanceKm": 4},
    )

    assert response.status_code == 400
    assert "corrida, ciclismo e futebol" in response.get_json()["error"]


def test_registers_exercise_on_previous_day_of_current_week(app, client):
    from datetime import date, timedelta

    from app.core.database import initialize_database

    if date.today().weekday() == 0:
        return
    with app.app_context():
        initialize_database()
    client.post(
        "/api/health/profile",
        json={"name": "Douglas", "heightCm": "175", "weightKg": "78", "goals": ["Praticar atividade física"], "exerciseDaysWeek": "3"},
    )
    previous_day = (date.today() - timedelta(days=1)).isoformat()

    response = client.post(
        "/api/health/exercise",
        json={"type": "Dança", "durationMinutes": 40, "exerciseDate": previous_day},
    )
    week = client.get("/api/health/exercise/week").get_json()

    assert response.status_code == 201
    assert response.get_json()["date"] == previous_day
    assert any(day["date"] == previous_day and day["hasExercise"] for day in week["days"])


def test_rejects_future_exercise_date(app, client):
    from datetime import date, timedelta

    from app.core.database import initialize_database

    with app.app_context():
        initialize_database()
    client.post(
        "/api/health/profile",
        json={"name": "Douglas", "heightCm": "175", "weightKg": "78", "goals": ["Praticar atividade física"]},
    )

    response = client.post(
        "/api/health/exercise",
        json={"type": "Corrida", "durationMinutes": 30, "exerciseDate": (date.today() + timedelta(days=1)).isoformat()},
    )

    assert response.status_code == 400
    assert "data futura" in response.get_json()["error"]


def test_deletes_exercise_and_updates_week(app, client):
    from datetime import date

    from app.core.database import initialize_database

    with app.app_context():
        initialize_database()
    client.post(
        "/api/health/profile",
        json={"name": "Douglas", "heightCm": "175", "weightKg": "78", "goals": ["Praticar atividade física"], "exerciseDaysWeek": "3"},
    )
    client.post(
        "/api/health/exercise",
        json={"type": "Dança", "durationMinutes": 30},
    )

    response = client.delete(f"/api/health/exercise/{date.today().isoformat()}")
    today = client.get("/api/health/exercise/today")

    assert response.status_code == 200
    assert response.get_json()["deleted"] is True
    assert response.get_json()["week"]["completedDays"] == 0
    assert today.get_json()["entry"] is None


def test_returns_not_found_when_deleting_empty_exercise_day(app, client):
    from datetime import date

    from app.core.database import initialize_database

    with app.app_context():
        initialize_database()
    client.post(
        "/api/health/profile",
        json={"name": "Douglas", "heightCm": "175", "weightKg": "78", "goals": ["Bem-estar geral"]},
    )

    response = client.delete(f"/api/health/exercise/{date.today().isoformat()}")

    assert response.status_code == 404
    assert "Não há exercício" in response.get_json()["error"]


def test_registers_custom_exercise_activity(app, client):
    from app.core.database import initialize_database

    with app.app_context():
        initialize_database()
    client.post(
        "/api/health/profile",
        json={"name": "Douglas", "heightCm": "175", "weightKg": "78", "goals": ["Praticar atividade física"]},
    )

    response = client.post(
        "/api/health/exercise",
        json={"type": "Outros", "customActivity": "Natação", "durationMinutes": 45},
    )

    assert response.status_code == 201
    assert response.get_json()["type"] == "Natação"


def test_requires_name_for_custom_exercise_activity(app, client):
    from app.core.database import initialize_database

    with app.app_context():
        initialize_database()
    client.post(
        "/api/health/profile",
        json={"name": "Douglas", "heightCm": "175", "weightKg": "78", "goals": ["Bem-estar geral"]},
    )

    response = client.post(
        "/api/health/exercise",
        json={"type": "Outros", "customActivity": "", "durationMinutes": 20},
    )

    assert response.status_code == 400
    assert "entre 2 e 50 caracteres" in response.get_json()["error"]


def test_returns_weekly_health_report(app, client):
    from app.core.database import initialize_database

    with app.app_context():
        initialize_database()
    client.post(
        "/api/health/profile",
        json={"name": "Douglas", "heightCm": "175", "weightKg": "80", "goals": ["Beber mais água", "Dormir melhor", "Praticar atividade física"], "waterGoalMl": "2000", "sleepGoalHours": "8", "exerciseDaysWeek": "3"},
    )
    client.post("/api/health/water", json={"amountMl": 500})
    client.post("/api/health/sleep", json={"bedtime": "23:00", "wakeTime": "07:00"})
    client.post("/api/health/exercise", json={"type": "Dança", "durationMinutes": 90})
    client.post("/api/health/weight", json={"weightKg": 79})

    response = client.get("/api/health/report/week")
    body = response.get_json()

    assert response.status_code == 200
    assert body["water"]["totalMl"] == 500
    assert body["sleep"]["averageMinutes"] == 480
    assert body["exercise"]["totalMinutes"] == 90
    assert body["exercise"]["modalities"] == ["Dança"]
    assert body["weight"]["currentWeightKg"] == 79
    assert body["recordedAreas"] == 4


def test_rejects_invalid_exercise(app, client):
    from app.core.database import initialize_database

    with app.app_context():
        initialize_database()

    invalid_type = client.post(
        "/api/health/exercise",
        json={"type": "Natação", "durationMinutes": 30},
    )
    invalid_duration = client.post(
        "/api/health/exercise",
        json={"type": "Corrida", "durationMinutes": 0},
    )

    assert invalid_type.status_code == 400
    assert "tipo de exercício válido" in invalid_type.get_json()["error"]
    assert invalid_duration.status_code == 400
    assert "entre 1 e 480 minutos" in invalid_duration.get_json()["error"]


def test_registers_weight_and_returns_evolution(app, client):
    from app.core.database import initialize_database

    with app.app_context():
        initialize_database()
    client.post(
        "/api/health/profile",
        json={"name": "Douglas", "heightCm": "175", "weightKg": "80", "goals": ["Perder peso"]},
    )

    response = client.post("/api/health/weight", json={"weightKg": "78,5"})
    summary = client.get("/api/health/weight")

    assert response.status_code == 201
    assert response.get_json()["currentWeightKg"] == 78.5
    assert response.get_json()["changeKg"] == -1.5
    assert response.get_json()["initialDate"]
    assert summary.get_json()["history"][0]["weightKg"] == 78.5


def test_rejects_invalid_weight(app, client):
    from app.core.database import initialize_database

    with app.app_context():
        initialize_database()
    client.post(
        "/api/health/profile",
        json={"name": "Douglas", "heightCm": "175", "weightKg": "80", "goals": ["Bem-estar geral"]},
    )

    response = client.post("/api/health/weight", json={"weightKg": 10})

    assert response.status_code == 400
    assert "entre 20 e 400 kg" in response.get_json()["error"]
