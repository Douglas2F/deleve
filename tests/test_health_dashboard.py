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
