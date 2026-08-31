from datetime import date, timedelta
import pytest


@pytest.fixture()
def water(client):
    client.post('/api/health/profile',json={'name':'Teste','heightCm':175,'weightKg':78,'goals':['Beber mais água'],'waterGoalMl':2000})
    return client


@pytest.mark.parametrize('days_ago',[0,35])
def test_clear_only_selected_day(water,days_ago):
    day=date.today()-timedelta(days=days_ago)
    other=day-timedelta(days=1)
    for amount in [250,900,750]:
        water.post('/api/health/water',json={'waterDate':str(day),'amountMl':amount})
    water.post('/api/health/water',json={'waterDate':str(other),'amountMl':500})
    response=water.delete(f'/api/health/water/day/{day}',json={'confirmed':True,'expectedTotalMl':1900})
    assert response.status_code==200
    assert response.json['totalMl']==0
    week=water.get(f'/api/health/water/week?date={day}').json
    assert next(d for d in week['days'] if d['date']==str(day))['totalMl']==0
    other_week=water.get(f'/api/health/water/week?date={other}').json
    assert next(d for d in other_week['days'] if d['date']==str(other))['totalMl']==500
    assert water.get('/api/health/profile').json['waterGoalMl']==2000


@pytest.mark.parametrize('payload',[{}, {'confirmed':False,'expectedTotalMl':250}, {'confirmed':True,'expectedTotalMl':0}, {'confirmed':True}])
def test_requires_confirmation_and_current_total(water,payload):
    water.post('/api/health/water',json={'amountMl':250})
    assert water.delete(f'/api/health/water/day/{date.today()}',json=payload).status_code==400
    assert water.get('/api/health/water/today').json['totalMl']==250


def test_rejects_invalid_and_future_dates(water):
    for day in ['invalid',str(date.today()+timedelta(days=1))]:
        assert water.delete(f'/api/health/water/day/{day}',json={'confirmed':True,'expectedTotalMl':0}).status_code==400


def test_current_profile_only(water):
    water.post('/api/health/water',json={'amountMl':250})
    water.post('/api/health/profile',json={'name':'Outro','heightCm':175,'weightKg':78,'goals':['Bem-estar geral']})
    assert water.delete(f'/api/health/water/day/{date.today()}',json={'confirmed':True,'expectedTotalMl':250}).status_code==400
