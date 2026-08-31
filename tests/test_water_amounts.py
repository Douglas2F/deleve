import pytest


@pytest.fixture()
def water_profile(client):
    client.post("/api/health/profile", json={"name": "Teste água", "heightCm": 175, "weightKg": 80, "goals": ["Beber mais água"], "waterGoalMl": 2000})
    return client


def test_quick_custom_and_default_amounts_update_same_totals(water_profile):
    total = 0
    for amount in [250, 500, 750, 375, 50, 2000]:
        response = water_profile.post("/api/health/water", json={"amountMl": amount})
        total += amount
        assert response.status_code == 201
        assert response.json["totalMl"] == total
    response = water_profile.post("/api/health/water", json={})
    assert response.json["totalMl"] == total + 250
    report = water_profile.get("/api/health/report/week").json
    assert report["water"]["totalMl"] == total + 250
    assert report["water"]["goalDays"] == 1


def test_minus_undoes_full_custom_entry_not_just_250(water_profile):
    water_profile.post("/api/health/water", json={"amountMl": 250})
    water_profile.post("/api/health/water", json={"amountMl": 750})
    removed = water_profile.delete("/api/health/water/latest")
    assert removed.json["removedAmountMl"] == 750
    assert removed.json["totalMl"] == 250
    assert water_profile.get("/api/health/water/today").json["totalMl"] == 250


@pytest.mark.parametrize("amount", [0, 49, 2001, -250, "", "abc"])
def test_invalid_amount_never_adds_water(water_profile, amount):
    assert water_profile.post("/api/health/water", json={"amountMl": amount}).status_code == 400
    assert water_profile.get("/api/health/water/today").json["totalMl"] == 0
