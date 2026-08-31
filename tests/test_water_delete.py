from datetime import date, timedelta

import pytest


@pytest.fixture()
def water_client(client):
    client.post('/api/health/profile', json={'name':'Teste','heightCm':175,'weightKg':78,'goals':['Beber mais água'],'waterGoalMl':2000})
    return client


def add_three(client, day):
    for amount in [250, 900, 750]:
        assert client.post('/api/health/water', json={'amountMl':amount,'waterDate':day.isoformat()}).status_code == 201
    week = client.get(f'/api/health/water/week?date={day}').json
    return next(item['entries'] for item in week['days'] if item['date'] == day.isoformat())


@pytest.mark.parametrize('days_ago', [0, 1, 35])
def test_delete_middle_water_entry_preserves_others(water_client, days_ago):
    day = date.today() - timedelta(days=days_ago)
    entries = add_three(water_client, day)
    assert [e['amountMl'] for e in entries] == [250,900,750]
    response = water_client.delete(f"/api/health/water/{entries[1]['id']}", json={'confirmed':True})
    assert response.status_code == 200
    assert response.json['totalMl'] == 1000
    assert response.json['removedAmountMl'] == 900
    week = water_client.get(f'/api/health/water/week?date={day}').json
    selected = next(item for item in week['days'] if item['date'] == day.isoformat())
    assert [e['id'] for e in selected['entries']] == [entries[0]['id'],entries[2]['id']]
    assert selected['totalMl'] == 1000
    assert water_client.delete(f"/api/health/water/{entries[1]['id']}", json={'confirmed':True}).status_code == 404


@pytest.mark.parametrize('payload', [{}, {'confirmed':False}, {'confirmed':'true'}, {'confirmed':1}])
def test_confirmation_required(water_client, payload):
    entries = add_three(water_client,date.today())
    assert water_client.delete(f"/api/health/water/{entries[1]['id']}",json=payload).status_code == 400
    assert water_client.get('/api/health/water/today').json['totalMl'] == 1900


def test_delete_old_water_recalculates_report_without_affecting_today(water_client):
    day=date.today()-timedelta(days=date.today().weekday()+1)
    entries=add_three(water_client,day)
    water_client.post('/api/health/water',json={'amountMl':500})
    latest=water_client.get('/api/health/latest-activity').json
    assert water_client.delete(f"/api/health/water/{entries[1]['id']}",json={'confirmed':True}).status_code == 200
    assert water_client.get('/api/health/report/week?weekOffset=-1').json['water']['totalMl'] == 1000
    assert water_client.get('/api/health/water/today').json['totalMl'] == 500
    assert water_client.get('/api/health/latest-activity').json == latest


def test_delete_all_selected_entries_empties_day(water_client):
    entries=add_three(water_client,date.today())
    for entry in entries:
        assert water_client.delete(f"/api/health/water/{entry['id']}",json={'confirmed':True}).status_code == 200
    assert water_client.get('/api/health/water/today').json['totalMl'] == 0
    assert water_client.get('/api/health/latest-activity').json['activity'] is None


def test_delete_cannot_access_other_profile(water_client):
    entries=add_three(water_client,date.today())
    water_client.post('/api/health/profile',json={'name':'Outro','heightCm':170,'weightKg':70,'goals':['Bem-estar geral']})
    assert water_client.delete(f"/api/health/water/{entries[0]['id']}",json={'confirmed':True}).status_code == 404
    assert water_client.get('/api/health/water/week').json['totalMl'] == 0


def test_weight_history_exposes_old_records_for_individual_deletion(water_client):
    client=water_client
    for days_ago in range(20):
        response=client.post('/api/health/weight',json={'weightKg':77,'recordedOn':(date.today()-timedelta(days=days_ago)).isoformat()})
        assert response.status_code == 201
    summary=client.get('/api/health/weight').json
    assert len([entry for entry in summary['history'] if entry['id'] is not None]) == 20
    oldest=summary['history'][-1]
    assert client.delete(f"/api/health/weight/{oldest['id']}",json={'confirmed':True}).status_code == 200
    assert len([entry for entry in client.get('/api/health/weight').json['history'] if entry['id'] is not None]) == 19
