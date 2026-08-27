import json

import pytest

from app.core.database import get_database, initialize_database
from app.modules.health.calorie_estimation import estimate_active_calories


@pytest.fixture()
def effort_client(client):
    response = client.post("/api/health/profile", json={
        "name": "Teste de esforço", "heightCm": "175", "weightKg": "80",
        "goals": ["Praticar atividade física"], "exerciseDaysWeek": "3",
    })
    assert response.status_code == 201
    return client


def payload(**changes):
    return {"type": "Musculação", "durationMinutes": 60,
            "calorieSource": "estimated", **changes}


@pytest.mark.parametrize("kind,effort,met,code", [
    ("Musculação", "light", 3.5, "02054"),
    ("Musculação", "moderate", 3.5, "02054"),
    ("Musculação", "intense", 6.0, "02050"),
    ("Dança", "light", 3.0, "03040"),
    ("Dança", "moderate", 5.0, "03010"),
    ("Dança", "intense", 6.8, "03012"),
    ("Futebol", "light", 7.0, "15610"),
    ("Futebol", "moderate", 7.0, "15610"),
    ("Futebol", "intense", 9.5, "15605"),
    ("Ciclismo", "light", 4.3, "01015"),
    ("Ciclismo", "moderate", 7.0, "01016"),
    ("Ciclismo", "intense", 9.0, "01017"),
])
def test_published_effort_references_preview_and_persist(effort_client, kind, effort, met, code):
    data = payload(type=kind, effort=effort)
    preview = effort_client.post("/api/health/exercise/calorie-estimate", json=data)
    assert preview.status_code == 200
    estimate = preview.get_json()["estimate"]
    assert estimate["met"] == met
    assert estimate["referenceCode"] == code
    assert estimate["effort"] == effort
    assert estimate["calculationBasis"] == "effort"
    saved = effort_client.post("/api/health/exercise", json=data)
    assert saved.status_code == 201
    entry = saved.get_json()
    assert entry["calorieEstimate"] == estimate
    assert entry["effort"] == effort
    today = effort_client.get("/api/health/exercise/today").get_json()
    assert today["entry"]["effort"] == effort
    assert today["totalCalories"] == estimate["calories"]


@pytest.mark.parametrize("kind", ["Corrida", "Ciclismo"])
def test_speed_takes_precedence_without_double_counting(kind):
    base = estimate_active_calories(kind, 30, 5, 80)
    for effort in ("light", "moderate", "intense"):
        result = estimate_active_calories(kind, 30, 5, 80, effort)
        assert result["calories"] == base["calories"]
        assert result["met"] == base["met"]
        assert result["calculationBasis"] == "speed"
        assert result["effort"] == effort


def test_running_effort_alone_does_not_invent_a_speed():
    for effort in ("light", "moderate", "intense"):
        result = estimate_active_calories("Corrida", 60, None, 80, effort)
        assert result["met"] == 7.5
        assert result["calculationBasis"] == "activity"
        assert result["effort"] == effort


def test_changing_and_clearing_effort_recalculates_same_activity(effort_client):
    entry = effort_client.post("/api/health/exercise", json=payload(effort="moderate")).get_json()
    assert entry["caloriesBurned"] == 200
    url = f"/api/health/exercise/{entry['id']}"
    intense = effort_client.put(url, json=payload(effort="intense")).get_json()
    assert intense["caloriesBurned"] == 400
    assert intense["effort"] == "intense"
    cleared = effort_client.put(url, json=payload(effort=None)).get_json()
    assert cleared["caloriesBurned"] == 200
    assert cleared["effort"] is None
    assert effort_client.get("/api/health/exercise/today").get_json()["activityCount"] == 1


@pytest.mark.parametrize("source,calories", [("manual", 420), ("none", None)])
def test_effort_never_changes_manual_or_empty_calories(effort_client, source, calories):
    data = payload(calorieSource=source, caloriesBurned=calories, effort="light")
    entry = effort_client.post("/api/health/exercise", json=data).get_json()
    updated = effort_client.put(f"/api/health/exercise/{entry['id']}",
                                json={**data, "effort": "intense"}).get_json()
    assert updated["effort"] == "intense"
    assert updated["caloriesBurned"] == calories
    assert updated["calorieSource"] == source
    assert updated["calorieEstimate"] is None


@pytest.mark.parametrize("value", ["easy", "Intenso", 3, {}, ["light"]])
def test_invalid_effort_is_rejected_without_writes(effort_client, value):
    data = payload(effort=value)
    assert effort_client.post("/api/health/exercise/calorie-estimate", json=data).status_code == 400
    assert effort_client.post("/api/health/exercise", json=data).status_code == 400
    assert effort_client.get("/api/health/exercise/today").get_json()["activityCount"] == 0


def test_legacy_snapshot_preserved_until_effort_changes(effort_client, app):
    entry = effort_client.post("/api/health/exercise", json=payload()).get_json()
    legacy = dict(entry["calorieEstimate"])
    legacy.pop("effort")
    legacy.pop("calculationBasis")
    legacy["method"] = "adult-compendium-2024-active-v1"
    with app.app_context():
        db = get_database()
        db.execute("UPDATE health_exercise_entries SET calorie_estimate = ? WHERE id = ?",
                   (json.dumps(legacy), entry["id"]))
        db.execute("UPDATE health_profiles SET current_weight_kg = 100")
        db.execute("UPDATE health_weight_entries SET weight_kg = 100")
        db.commit()
    url = f"/api/health/exercise/{entry['id']}"
    same = effort_client.put(url, json=payload(note="Só a observação")).get_json()
    assert same["calorieEstimate"] == legacy
    assert same["caloriesBurned"] == 200
    changed = effort_client.put(url, json=payload(effort="intense")).get_json()
    assert changed["calorieEstimate"]["weightKg"] == 100
    assert changed["caloriesBurned"] == 500


def test_migrations_preserve_effort_and_legacy_rows(effort_client, app):
    entry = effort_client.post("/api/health/exercise", json=payload(effort="intense")).get_json()
    with app.app_context():
        db = get_database()
        db.execute("CREATE UNIQUE INDEX old_daily ON health_exercise_entries(profile_id, exercise_date)")
        db.commit()
        initialize_database()
        initialize_database()
    assert effort_client.get("/api/health/exercise/today").get_json()["entry"] == entry
    with app.app_context():
        db = get_database()
        db.execute("ALTER TABLE health_exercise_entries DROP COLUMN effort")
        db.commit()
        initialize_database()
        row = db.execute("SELECT * FROM health_exercise_entries").fetchone()
        assert row["effort"] is None
        assert row["calories_burned"] == entry["caloriesBurned"]
        assert json.loads(row["calorie_estimate"]) == entry["calorieEstimate"]
