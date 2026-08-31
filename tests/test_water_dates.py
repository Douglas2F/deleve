from datetime import date, timedelta

import pytest


@pytest.fixture()
def water_client(client):
    client.post('/api/health/profile', json={
        'name': 'Teste', 'heightCm': 175, 'weightKg': 78,
        'goals': ['Beber mais água'], 'waterGoalMl': 2000,
    })
    return client


def add(client, day=None, amount=750):
    payload = {'amountMl': amount}
    if day is not None:
        payload['waterDate'] = day.isoformat()
    return client.post('/api/health/water', json=payload)


def test_past_water_does_not_change_today_latest_or_preferred_portion(water_client):
    client = water_client
    client.put('/api/health/water/portion', json={'amountMl': 900})
    add(client, amount=500)
    today = client.get('/api/health/water/today').json
    latest = client.get('/api/health/latest-activity').json
    sunday = date.today() - timedelta(days=date.today().weekday() + 1)
    first = add(client, sunday, 2000)
    assert first.status_code == 201
    assert first.json['waterDate'] == sunday.isoformat()
    assert first.json['totalMl'] == 2000
    assert add(client, sunday, 900).json['totalMl'] == 2900
    week = client.get(f'/api/health/water/week?date={sunday}').json
    assert week['totalMl'] == 2900
    assert week['elapsedDays'] == 7
    assert week['averageMl'] == round(2900 / 7)
    assert week['goalDays'] == 1
    assert all(not day['isToday'] and not day['isFuture'] for day in week['days'])
    assert client.get('/api/health/water/today').json == today
    assert client.get('/api/health/latest-activity').json == latest
    assert client.get('/api/health/water/week').json['totalMl'] == 500
    assert client.get('/api/health/profile').json['waterPortionMl'] == 900
    assert client.get('/api/health/report/week?weekOffset=-1').json['water']['totalMl'] == 2900


def test_selected_week_includes_sunday_after_selected_monday(water_client):
    monday = date.today() - timedelta(days=date.today().weekday() + 7)
    add(water_client, monday, 750)
    add(water_client, monday + timedelta(days=6), 900)
    week = water_client.get(f'/api/health/water/week?date={monday}').json
    assert week['totalMl'] == 1650
    assert week['elapsedDays'] == 7
    assert week['days'][0]['totalMl'] == 750
    assert week['days'][6]['totalMl'] == 900


def test_dashboard_plus_and_minus_remain_today_only(water_client):
    old = date.today() - timedelta(days=35)
    add(water_client, old, 750)
    water_client.put('/api/health/water/portion', json={'amountMl': 900})
    result = water_client.post('/api/health/water', json={})
    assert result.json['waterDate'] == date.today().isoformat()
    assert result.json['totalMl'] == 900
    assert water_client.delete('/api/health/water/latest').json['removedAmountMl'] == 900
    assert water_client.get('/api/health/water/today').json['totalMl'] == 0
    assert water_client.get(f'/api/health/water/week?date={old}').json['totalMl'] == 750


@pytest.mark.parametrize('value', ['invalid', '2026-02-30', '0000-01-01', '9999-12-31'])
def test_invalid_water_dates_rejected_without_writes(water_client, value):
    result = water_client.post('/api/health/water', json={'amountMl': 900, 'waterDate': value})
    assert result.status_code == 400
    assert water_client.get(f'/api/health/water/week?date={value}').status_code == 400
    assert water_client.get('/api/health/water/today').json['totalMl'] == 0


def test_future_water_date_rejected(water_client):
    future = date.today() + timedelta(days=1)
    assert add(water_client, future).status_code == 400
    assert water_client.get(f'/api/health/water/week?date={future}').status_code == 400


def test_historical_water_is_scoped_to_current_profile(water_client):
    day = date.today() - timedelta(days=10)
    add(water_client, day)
    water_client.post('/api/health/profile', json={
        'name': 'Outro', 'heightCm': 170, 'weightKg': 70, 'goals': ['Bem-estar geral'],
    })
    assert water_client.get(f'/api/health/water/week?date={day}').json['totalMl'] == 0


def test_current_week_average_uses_elapsed_days(water_client):
    add(water_client, amount=1000)
    week = water_client.get('/api/health/water/week').json
    elapsed = date.today().weekday() + 1
    assert week['elapsedDays'] == elapsed
    assert week['averageMl'] == round(1000 / elapsed)
    assert sum(day['isToday'] for day in week['days']) == 1
