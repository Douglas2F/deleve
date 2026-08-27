from datetime import date, timedelta

import pytest

from app.core.database import get_database, initialize_database
from app.modules.health.calorie_estimation import estimate_active_calories


@pytest.fixture()
def calorie_client(client):
    response = client.post("/api/health/profile", json={
        "name": "Teste", "heightCm": "175", "weightKg": "80",
        "goals": ["Praticar atividade física"], "exerciseDaysWeek": "3",
    })
    assert response.status_code == 201
    return client


def payload(**changes):
    return {"type": "Musculação", "durationMinutes": 60,
            "calorieSource": "estimated", **changes}


def test_active_calories_exclude_resting_energy():
    estimate = estimate_active_calories("Musculação", 60, None, 80)
    assert estimate["calories"] == 200
    assert estimate["met"] == 3.5
    assert estimate["kind"] == "active"
    assert estimate["referenceCode"] == "02054"
    assert estimate_active_calories("Musculação", 30, None, 80)["calories"] == 100
    assert estimate_active_calories("Musculação", 60, None, 40)["calories"] == 100


def test_distance_selects_running_and_cycling_references():
    run = estimate_active_calories("Corrida", 30, 5.1 * 1.609344 / 2, 80)
    assert run["met"] == 8.5
    assert run["calories"] == 300
    bike = estimate_active_calories("Ciclismo", 20, 5, 80)
    assert bike["met"] == 4
    assert bike["calories"] == 80
    assert estimate_active_calories("Ciclismo", 60, 10 * 1.609344, 80)["met"] == 6.8


@pytest.mark.parametrize("kind,expected,code", [
    ("Musculação", 200, "02054"),
    ("Dança", 224, "03070"),
    ("Futebol", 480, "15610"),
    ("Corrida", 520, "12020"),
    ("Ciclismo", 480, "01014"),
])
def test_each_modality_previews_and_saves_its_own_reference(calorie_client, kind, expected, code):
    client = calorie_client
    data = payload(type=kind)
    preview = client.post("/api/health/exercise/calorie-estimate", json=data)
    assert preview.status_code == 200
    estimate = preview.get_json()["estimate"]
    assert estimate["type"] == kind
    assert estimate["referenceCode"] == code
    assert estimate["calories"] == expected
    assert client.get("/api/health/exercise/today").get_json()["activityCount"] == 0
    response = client.post("/api/health/exercise", json=data)
    assert response.status_code == 201
    entry = response.get_json()
    assert entry["caloriesBurned"] == expected
    assert entry["calorieSource"] == "estimated"
    assert entry["calorieEstimate"] == estimate


@pytest.mark.parametrize("kind", ["Musculação", "Dança", "Futebol", "Corrida", "Ciclismo"])
def test_each_modality_preserves_manual_and_blank_calories(calorie_client, kind):
    client = calorie_client
    entry = client.post("/api/health/exercise", json=payload(
        type=kind, calorieSource="manual", caloriesBurned=420,
    )).get_json()
    assert entry["caloriesBurned"] == 420
    assert entry["calorieSource"] == "manual"
    response = client.put(f"/api/health/exercise/{entry['id']}", json=payload(
        type=kind, calorieSource="none", durationMinutes=90,
    ))
    assert response.status_code == 200
    assert response.get_json()["caloriesBurned"] is None
    assert response.get_json()["calorieSource"] == "none"


def test_switching_modality_recalculates_estimate_without_adding_entries(calorie_client):
    client = calorie_client
    entry = client.post("/api/health/exercise", json=payload()).get_json()
    for kind, expected in [("Dança", 224), ("Futebol", 480), ("Corrida", 520), ("Ciclismo", 480)]:
        data = payload(type=kind, entryId=entry["id"])
        preview = client.post("/api/health/exercise/calorie-estimate", json=data).get_json()["estimate"]
        assert preview["type"] == kind
        assert preview["calories"] == expected
        saved = client.put(f"/api/health/exercise/{entry['id']}", json=data).get_json()
        assert saved["calorieEstimate"] == preview
    assert client.get("/api/health/exercise/today").get_json()["activityCount"] == 1


@pytest.mark.parametrize("kind,minutes,distance,weight", [
    ("Outros", 60, None, 80), ("Musculação", 0, None, 80),
    ("Musculação", 481, None, 80), ("Musculação", 60, None, float("nan")),
    ("Musculação", 60, None, 0), ("Corrida", 30, 0, 80),
    ("Corrida", 30, float("inf"), 80), ("Corrida", 30, 100, 80),
    ("Ciclismo", 60, 1, 80), ("Ciclismo", 60, 100, 80),
])
def test_unsupported_or_out_of_range_has_no_estimate(kind, minutes, distance, weight):
    assert estimate_active_calories(kind, minutes, distance, weight) is None


def test_preview_is_read_only_and_save_recalculates_on_server(calorie_client):
    client = calorie_client
    response = client.post("/api/health/exercise/calorie-estimate", json=payload())
    assert response.status_code == 200
    assert response.get_json()["estimate"]["calories"] == 200
    assert client.get("/api/health/exercise/today").get_json()["activityCount"] == 0
    saved = client.post("/api/health/exercise", json=payload(caloriesBurned=9999))
    assert saved.status_code == 201
    entry = saved.get_json()
    assert entry["caloriesBurned"] == 200
    assert entry["calorieSource"] == "estimated"
    assert entry["calorieEstimate"]["weightKg"] == 80
    assert client.get("/api/health/exercise/today").get_json()["entry"] == entry


def test_manual_override_and_explicit_empty_survive_edits(calorie_client):
    client = calorie_client
    entry = client.post("/api/health/exercise", json=payload()).get_json()
    url = f"/api/health/exercise/{entry['id']}"
    manual = client.put(url, json=payload(calorieSource="manual", caloriesBurned=420,
                                         durationMinutes=90)).get_json()
    assert manual["caloriesBurned"] == 420
    assert manual["calorieSource"] == "manual"
    assert manual["calorieEstimate"] is None
    empty = client.put(url, json=payload(calorieSource="none", caloriesBurned=420)).get_json()
    assert empty["caloriesBurned"] is None
    assert empty["calorieSource"] == "none"
    restored = client.put(url, json=payload()).get_json()
    assert restored["caloriesBurned"] == 200
    assert restored["calorieSource"] == "estimated"


def test_legacy_clients_and_legacy_rows_are_not_auto_estimated(calorie_client, app):
    client = calorie_client
    base = {"type": "Musculação", "durationMinutes": 60}
    manual = client.post("/api/health/exercise", json={**base, "caloriesBurned": 420}).get_json()
    empty = client.post("/api/health/exercise", json=base).get_json()
    with app.app_context():
        db = get_database()
        db.execute("UPDATE health_exercise_entries SET calorie_source = NULL, calorie_estimate = NULL")
        db.commit()
        initialize_database()
    entries = {e["id"]: e for e in client.get("/api/health/exercise/today").get_json()["entries"]}
    assert entries[manual["id"]]["caloriesBurned"] == 420
    assert entries[manual["id"]]["calorieSource"] == "manual"
    assert entries[empty["id"]]["caloriesBurned"] is None
    assert entries[empty["id"]]["calorieSource"] == "none"


def test_estimate_snapshot_survives_weight_change_and_note_edit(calorie_client, app):
    client = calorie_client
    entry = client.post("/api/health/exercise", json=payload()).get_json()
    with app.app_context():
        db = get_database()
        db.execute("UPDATE health_profiles SET current_weight_kg = 100")
        db.execute("UPDATE health_weight_entries SET weight_kg = 100")
        db.commit()
    preview = client.post("/api/health/exercise/calorie-estimate",
                          json=payload(entryId=entry["id"])).get_json()
    assert preview["estimate"] == entry["calorieEstimate"]
    edited = client.put(f"/api/health/exercise/{entry['id']}",
                        json=payload(note="Só alterei a observação")).get_json()
    assert edited["calorieEstimate"] == entry["calorieEstimate"]
    changed = client.put(f"/api/health/exercise/{entry['id']}",
                         json=payload(durationMinutes=30)).get_json()
    assert changed["caloriesBurned"] == 125
    assert changed["calorieEstimate"]["weightKg"] == 100


def test_past_activity_does_not_use_future_weight(calorie_client, app):
    monday = date.today() - timedelta(days=date.today().weekday())
    if monday == date.today():
        pytest.skip("No earlier day this week")
    with app.app_context():
        db = get_database()
        db.execute("DELETE FROM health_weight_entries")
        profile_id = db.execute("SELECT id FROM health_profiles ORDER BY id DESC").fetchone()[0]
        db.execute("INSERT INTO health_weight_entries (profile_id, recorded_on, weight_kg) VALUES (?, ?, ?)",
                   (profile_id, monday.isoformat(), 70))
        db.execute("INSERT INTO health_weight_entries (profile_id, recorded_on, weight_kg) VALUES (?, ?, ?)",
                   (profile_id, date.today().isoformat(), 90))
        db.commit()
    estimate = calorie_client.post("/api/health/exercise/calorie-estimate",
                                    json=payload(exerciseDate=monday.isoformat())).get_json()["estimate"]
    assert estimate["weightKg"] == 70
    assert estimate["calories"] == 175


def test_mixed_totals_reach_day_week_and_report(calorie_client):
    client = calorie_client
    estimate = client.post("/api/health/exercise", json=payload()).get_json()
    client.post("/api/health/exercise", json=payload(calorieSource="manual", caloriesBurned=420))
    for path in ("/api/health/exercise/today", "/api/health/exercise/week", "/api/health/report/week"):
        body = client.get(path).get_json()
        summary = body["exercise"] if path.endswith("report/week") else body
        assert summary["totalCalories"] == 620
        assert summary["estimatedCalories"] == 200
        assert summary["manualCalories"] == 420
        assert summary["calorieSource"] == "mixed"
    client.delete(f"/api/health/exercise/{estimate['id']}")
    today = client.get("/api/health/exercise/today").get_json()
    assert today["totalCalories"] == 420
    assert today["calorieSource"] == "manual"


def test_invalid_source_and_unknown_preview_id(calorie_client):
    assert calorie_client.post("/api/health/exercise",
                               json=payload(calorieSource="watch")).status_code == 400
    assert calorie_client.post("/api/health/exercise/calorie-estimate",
                               json=payload(entryId=999999)).status_code == 400


def test_custom_activity_does_not_get_unsupported_estimate(calorie_client):
    data = payload(type="Outros", customActivity="Corrida")
    assert calorie_client.post("/api/health/exercise/calorie-estimate", json=data).get_json()["estimate"] is None
    saved = calorie_client.post("/api/health/exercise", json=data).get_json()
    assert saved["caloriesBurned"] is None
    assert saved["calorieSource"] == "none"


def test_multiple_activity_migration_preserves_estimate_metadata(calorie_client, app):
    entry = calorie_client.post("/api/health/exercise", json=payload()).get_json()
    with app.app_context():
        db = get_database()
        db.execute("CREATE UNIQUE INDEX old_daily ON health_exercise_entries(profile_id, exercise_date)")
        db.commit()
        initialize_database()
        initialize_database()
    assert calorie_client.get("/api/health/exercise/today").get_json()["entry"] == entry
