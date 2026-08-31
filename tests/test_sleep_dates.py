from datetime import date, timedelta

import pytest

from app.core.database import get_database


@pytest.fixture()
def sleep_client(client):
    client.post('/api/health/profile', json={
        'name': 'Teste', 'heightCm': 175, 'weightKg': 78,
        'goals': ['Dormir melhor'], 'sleepGoalHours': 8,
    })
    return client


def save(client, day, bedtime='23:00', wake='07:00'):
    return client.post('/api/health/sleep', json={
        'bedtime': bedtime, 'wakeTime': wake, 'sleepDate': day.isoformat(),
    })


def test_previous_week_sleep_keeps_today_and_latest_unchanged(sleep_client):
    client = sleep_client
    save(client, date.today(), '00:00', '07:00')
    today = client.get('/api/health/sleep/today').json
    latest = client.get('/api/health/latest-activity').json
    sunday = date.today() - timedelta(days=date.today().weekday() + 1)
    response = save(client, sunday)
    assert response.status_code == 201
    assert response.json['date'] == sunday.isoformat()
    assert response.json['durationMinutes'] == 480
    week = client.get(f'/api/health/sleep/week?date={sunday}').json
    assert week['completedDays'] == 1
    assert week['goalDays'] == 1
    assert week['averageMinutes'] == 480
    assert all(not day['isToday'] for day in week['days'])
    assert client.get('/api/health/sleep/today').json == today
    assert client.get('/api/health/latest-activity').json == latest
    assert client.get('/api/health/sleep/week').json['averageMinutes'] == 420
    report = client.get('/api/health/report/week?weekOffset=-1').json['sleep']
    assert report['averageMinutes'] == 480


def test_selected_week_includes_whole_week(sleep_client):
    monday = date.today() - timedelta(days=date.today().weekday() + 7)
    save(sleep_client, monday)
    save(sleep_client, monday + timedelta(days=6), '23:00', '06:00')
    week = sleep_client.get(f'/api/health/sleep/week?date={monday}').json
    assert len(week['days']) == 7
    assert week['completedDays'] == 2
    assert week['averageMinutes'] == 450


def test_edit_and_delete_historical_sleep_preserve_other_dates(sleep_client):
    day = date.today() - timedelta(days=35)
    save(sleep_client, day)
    save(sleep_client, date.today())
    response = save(sleep_client, day, '22:30', '07:00')
    assert response.status_code == 201
    week = sleep_client.get(f'/api/health/sleep/week?date={day}').json
    assert week['completedDays'] == 1
    assert week['averageMinutes'] == 510
    assert sleep_client.delete(f'/api/health/sleep/{day}').status_code == 200
    assert sleep_client.get(f'/api/health/sleep/week?date={day}').json['completedDays'] == 0
    assert sleep_client.get('/api/health/sleep/today').json['entry']['durationMinutes'] == 480
    assert sleep_client.delete(f'/api/health/sleep/{day}').status_code == 404


@pytest.mark.parametrize('value', ['invalid', '2026-02-30', '0000-01-01', '9999-12-31'])
def test_invalid_dates_rejected_without_writes(sleep_client, value):
    response = sleep_client.post('/api/health/sleep', json={
        'bedtime': '23:00', 'wakeTime': '07:00', 'sleepDate': value,
    })
    assert response.status_code == 400
    assert sleep_client.get(f'/api/health/sleep/week?date={value}').status_code == 400
    assert sleep_client.delete(f'/api/health/sleep/{value}').status_code == 400
    assert sleep_client.get('/api/health/sleep/today').json['entry'] is None


def test_future_dates_rejected(sleep_client):
    tomorrow = date.today() + timedelta(days=1)
    assert save(sleep_client, tomorrow).status_code == 400
    assert sleep_client.get(f'/api/health/sleep/week?date={tomorrow}').status_code == 400


def test_sleep_history_scoped_to_current_profile(sleep_client):
    day = date.today() - timedelta(days=10)
    save(sleep_client, day)
    sleep_client.post('/api/health/profile', json={
        'name': 'Outro', 'heightCm': 170, 'weightKg': 70, 'goals': ['Bem-estar geral'],
    })
    assert sleep_client.get(f'/api/health/sleep/week?date={day}').json['completedDays'] == 0
    assert sleep_client.delete(f'/api/health/sleep/{day}').status_code == 404


def test_current_summary_excludes_legacy_future_rows(sleep_client, app):
    sunday = date.today() + timedelta(days=6-date.today().weekday())
    if sunday == date.today():
        return
    with app.app_context():
        db = get_database()
        db.execute("INSERT INTO health_sleep_entries (profile_id, sleep_date, bedtime, wake_time, duration_minutes) VALUES (1, ?, '23:00', '07:00', 480)", (sunday.isoformat(),))
        db.commit()
    assert sleep_client.get('/api/health/sleep/week').json['completedDays'] == 0
