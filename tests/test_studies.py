from datetime import date


def create_profile(client):
    return client.post(
        "/api/health/profile",
        json={
            "name": "Douglas",
            "heightCm": "175",
            "weightKg": "78",
            "goals": ["Bem-estar geral"],
        },
    )


def test_studies_require_a_profile(client):
    response = client.get("/api/studies/overview")

    assert response.status_code == 400
    assert "perfil" in response.get_json()["error"].lower()


def test_creates_subject_and_task_for_today(client):
    create_profile(client)
    subject = client.post("/api/studies/subjects", json={"name": "Matemática"})
    task = client.post(
        "/api/studies/tasks",
        json={
            "title": "Revisar capítulo 3",
            "type": "Revisão",
            "subjectId": subject.get_json()["id"],
            "date": date.today().isoformat(),
            "plannedMinutes": 40,
        },
    )
    overview = client.get("/api/studies/overview").get_json()

    assert subject.status_code == 201
    assert task.status_code == 201
    assert overview["focusTask"]["title"] == "Revisar capítulo 3"
    assert overview["plannedMinutes"] == 40
    assert overview["subjects"][0]["taskCount"] == 1


def test_completes_and_reopens_study_task(client):
    create_profile(client)
    task_id = client.post(
        "/api/studies/tasks",
        json={"title": "Ler 15 páginas", "type": "Leitura", "plannedMinutes": 25},
    ).get_json()["id"]

    completed = client.patch(f"/api/studies/tasks/{task_id}", json={"completed": True})
    overview = client.get("/api/studies/overview").get_json()
    reopened = client.patch(f"/api/studies/tasks/{task_id}", json={"completed": False})

    assert completed.get_json()["completed"] is True
    assert overview["completedCount"] == 1
    assert overview["focusTask"] is None
    assert reopened.get_json()["completed"] is False


def test_edits_and_deletes_study_task(client):
    create_profile(client)
    task_id = client.post(
        "/api/studies/tasks",
        json={"title": "Assistir aula", "type": "Aula", "plannedMinutes": 30},
    ).get_json()["id"]

    edited = client.put(
        f"/api/studies/tasks/{task_id}",
        json={"title": "Assistir aula de Português", "plannedMinutes": 45},
    )
    deleted = client.delete(f"/api/studies/tasks/{task_id}")

    assert edited.get_json()["title"] == "Assistir aula de Português"
    assert edited.get_json()["plannedMinutes"] == 45
    assert deleted.get_json()["deleted"] is True
    assert client.get("/api/studies/overview").get_json()["tasks"] == []


def test_rejects_invalid_study_task(client):
    create_profile(client)

    invalid_type = client.post(
        "/api/studies/tasks",
        json={"title": "Tarefa válida", "type": "Outro", "plannedMinutes": 30},
    )
    invalid_duration = client.post(
        "/api/studies/tasks",
        json={"title": "Tarefa válida", "type": "Estudo", "plannedMinutes": 2},
    )

    assert invalid_type.status_code == 400
    assert "tipo" in invalid_type.get_json()["error"].lower()
    assert invalid_duration.status_code == 400
    assert "duração" in invalid_duration.get_json()["error"].lower()


def test_subject_with_tasks_must_be_emptied_before_deletion(client):
    create_profile(client)
    subject_id = client.post("/api/studies/subjects", json={"name": "História"}).get_json()["id"]
    task_id = client.post(
        "/api/studies/tasks",
        json={"title": "Revisar resumo", "subjectId": subject_id, "plannedMinutes": 20},
    ).get_json()["id"]

    blocked = client.delete(f"/api/studies/subjects/{subject_id}")
    client.delete(f"/api/studies/tasks/{task_id}")
    deleted = client.delete(f"/api/studies/subjects/{subject_id}")

    assert blocked.status_code == 409
    assert deleted.get_json()["deleted"] is True


def test_records_study_session_and_completes_task(client):
    create_profile(client)
    task_id = client.post(
        "/api/studies/tasks",
        json={"title": "Revisar anotações", "plannedMinutes": 30},
    ).get_json()["id"]

    session = client.post(
        f"/api/studies/tasks/{task_id}/sessions",
        json={"durationSeconds": 125},
    )
    overview = client.get("/api/studies/overview").get_json()

    assert session.status_code == 201
    assert session.get_json()["completed"] is True
    assert session.get_json()["studiedSeconds"] == 125
    assert overview["studiedSeconds"] == 125
    assert overview["completedCount"] == 1


def test_rejects_invalid_study_session_duration(client):
    create_profile(client)
    task_id = client.post(
        "/api/studies/tasks",
        json={"title": "Estudar inglês", "plannedMinutes": 20},
    ).get_json()["id"]

    response = client.post(
        f"/api/studies/tasks/{task_id}/sessions",
        json={"durationSeconds": 0},
    )

    assert response.status_code == 400
    assert "tempo" in response.get_json()["error"].lower()
