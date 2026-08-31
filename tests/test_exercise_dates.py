from datetime import date, timedelta

import pytest


@pytest.fixture()
def activity_client(client):
    client.post('/api/health/profile', json={
        'name': 'Teste', 'heightCm': 175, 'weightKg': 78,
        'goals': ['Praticar atividade física'], 'exerciseDaysWeek': 3,
    })
    return client


def record(client, day=None, **changes):
    payload = {'type': 'Ciclismo', 'durationSeconds': 1789, 'distanceKm': 5,
               'calorieSource': 'manual', 'caloriesBurned': 120}
    if day is not None:
        payload['exerciseDate'] = day.isoformat()
    payload.update(changes)
    return client.post('/api/health/exercise', json=payload)


def test_past_week_records_keep_today_and_latest_unchanged(activity_client):
    client = activity_client
    assert record(client).status_code == 201
    before = client.get('/api/health/exercise/today').json
    latest = client.get('/api/health/latest-activity').json
    previous_sunday = date.today() - timedelta(days=date.today().weekday() + 1)
    first = record(client, previous_sunday).json
    second = record(client, previous_sunday, type='Musculação', distanceKm=None,
                    durationSeconds=3606).json
    assert first['id'] != second['id']
    week = client.get(f'/api/health/exercise/week?date={previous_sunday}').json
    assert week['activityCount'] == 2
    assert week['completedDays'] == 1
    assert week['totalSeconds'] == 5395
    assert all(not day['isToday'] for day in week['days'])
    assert client.get('/api/health/exercise/today').json == before
    assert client.get('/api/health/latest-activity').json == latest
    assert client.get('/api/health/exercise/week').json['activityCount'] == 1
    report = client.get('/api/health/report/week?weekOffset=-1').json['exercise']
    assert report['activityCount'] == 2
    assert report['totalSeconds'] == 5395


def test_selected_week_includes_days_after_selected_date(activity_client):
    monday = date.today() - timedelta(days=date.today().weekday() + 7)
    sunday = monday + timedelta(days=6)
    assert record(activity_client, monday).status_code == 201
    assert record(activity_client, sunday).status_code == 201
    week = activity_client.get(f'/api/health/exercise/week?date={monday}').json
    assert week['startDate'] == monday.isoformat()
    assert week['endDate'] == sunday.isoformat()
    assert week['activityCount'] == 2
    assert week['completedDays'] == 2


def test_edit_and_delete_old_activity_preserve_date_and_other_entries(activity_client):
    day = date.today() - timedelta(days=35)
    first = record(activity_client, day).json
    second = record(activity_client, day).json
    response = activity_client.put(f"/api/health/exercise/{first['id']}", json={
        'type': 'Ciclismo', 'durationSeconds': 2101, 'distanceKm': 6,
    })
    assert response.status_code == 200
    assert response.json['date'] == day.isoformat()
    assert activity_client.delete(f"/api/health/exercise/{first['id']}").status_code == 200
    week = activity_client.get(f'/api/health/exercise/week?date={day}').json
    entries = next(d['entries'] for d in week['days'] if d['date'] == day.isoformat())
    assert [entry['id'] for entry in entries] == [second['id']]
    assert activity_client.get('/api/health/exercise/today').json['activityCount'] == 0


@pytest.mark.parametrize('value', ['invalid', '2026-02-30', '0000-01-01', '9999-12-31'])
def test_invalid_dates_rejected_without_creating_activity(activity_client, value):
    assert record(activity_client, exerciseDate=value).status_code == 400
    assert activity_client.get(f'/api/health/exercise/week?date={value}').status_code == 400
    assert activity_client.get('/api/health/exercise/today').json['activityCount'] == 0


def test_future_date_rejected_for_save_and_estimate(activity_client):
    future = date.today() + timedelta(days=1)
    assert record(activity_client, future).status_code == 400
    assert activity_client.post('/api/health/exercise/calorie-estimate', json={
        'type': 'Ciclismo', 'durationSeconds': 1800, 'exerciseDate': future.isoformat(),
    }).status_code == 400


def test_calorie_estimate_available_for_past_date(activity_client):
    day = date.today() - timedelta(days=35)
    response = activity_client.post('/api/health/exercise/calorie-estimate', json={
        'type': 'Musculação', 'durationSeconds': 3600, 'exerciseDate': day.isoformat(),
    })
    assert response.status_code == 200
    assert response.json['estimate']['calories'] > 0


def test_historical_week_is_scoped_to_current_profile(activity_client):
    day = date.today() - timedelta(days=10)
    entry = record(activity_client, day).json
    activity_client.post('/api/health/profile', json={
        'name': 'Outro', 'heightCm': 175, 'weightKg': 80, 'goals': ['Bem-estar geral'],
    })
    assert activity_client.get(f'/api/health/exercise/week?date={day}').json['activityCount'] == 0
    assert activity_client.delete(f"/api/health/exercise/{entry['id']}").status_code == 404
