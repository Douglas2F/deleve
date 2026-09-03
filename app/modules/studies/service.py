from datetime import date, datetime, time, timedelta

from app.core.database import get_database


TASK_TYPES = {"Estudo", "Leitura", "Aula", "Exercícios", "Revisão"}


def _profile_id() -> int:
    row = get_database().execute(
        "SELECT id FROM health_profiles ORDER BY id DESC LIMIT 1"
    ).fetchone()
    if row is None:
        raise ValueError("Configure seu perfil antes de usar o módulo Estudos.")
    return int(row["id"])


def _text(value, label: str, maximum: int) -> str:
    normalized = " ".join(str(value or "").split())
    if not 2 <= len(normalized) <= maximum:
        raise ValueError(f"{label} deve ter entre 2 e {maximum} caracteres.")
    return normalized


def _date(value) -> str:
    try:
        return date.fromisoformat(str(value or date.today().isoformat())).isoformat()
    except ValueError as error:
        raise ValueError("Informe uma data válida para a tarefa.") from error


def _minutes(value) -> int:
    try:
        minutes = int(value)
    except (TypeError, ValueError) as error:
        raise ValueError("Informe uma duração entre 5 e 480 minutos.") from error
    if not 5 <= minutes <= 480:
        raise ValueError("Informe uma duração entre 5 e 480 minutos.")
    return minutes


def _seconds(value) -> int:
    try:
        seconds = int(value)
    except (TypeError, ValueError) as error:
        raise ValueError("Informe um tempo de estudo válido.") from error
    if not 1 <= seconds <= 28800:
        raise ValueError("O tempo de estudo deve ficar entre 1 segundo e 8 horas.")
    return seconds


def _subject_for_profile(subject_id, profile_id: int) -> int | None:
    if subject_id in (None, ""):
        return None
    try:
        parsed = int(subject_id)
    except (TypeError, ValueError) as error:
        raise ValueError("Selecione uma matéria válida.") from error
    row = get_database().execute(
        "SELECT id FROM study_subjects WHERE id = ? AND profile_id = ?",
        (parsed, profile_id),
    ).fetchone()
    if row is None:
        raise ValueError("Selecione uma matéria válida.")
    return parsed


def _task_payload(row) -> dict:
    return {
        "id": row["id"],
        "title": row["title"],
        "type": row["task_type"],
        "date": row["task_date"],
        "plannedMinutes": row["planned_minutes"],
        "studiedSeconds": row["studied_seconds"],
        "completed": bool(row["completed"]),
        "subject": (
            {"id": row["subject_id"], "name": row["subject_name"]}
            if row["subject_id"] is not None
            else None
        ),
    }


def list_subjects() -> list[dict]:
    profile_id = _profile_id()
    rows = get_database().execute(
        """
        SELECT subject.id, subject.name, COUNT(task.id) AS task_count
        FROM study_subjects subject
        LEFT JOIN study_tasks task
          ON task.subject_id = subject.id AND task.profile_id = subject.profile_id
        WHERE subject.profile_id = ?
        GROUP BY subject.id, subject.name
        ORDER BY subject.name COLLATE NOCASE
        """,
        (profile_id,),
    ).fetchall()
    return [
        {"id": row["id"], "name": row["name"], "taskCount": row["task_count"]}
        for row in rows
    ]


def create_subject(data: dict) -> dict:
    profile_id = _profile_id()
    name = _text(data.get("name"), "O nome da matéria", 50)
    database = get_database()
    duplicate = database.execute(
        "SELECT id FROM study_subjects WHERE profile_id = ? AND lower(name) = lower(?)",
        (profile_id, name),
    ).fetchone()
    if duplicate is not None:
        raise ValueError("Essa matéria já foi cadastrada.")
    cursor = database.execute(
        "INSERT INTO study_subjects (profile_id, name) VALUES (?, ?)",
        (profile_id, name),
    )
    database.commit()
    return {"id": cursor.lastrowid, "name": name, "taskCount": 0}


def delete_subject(subject_id: int) -> bool:
    profile_id = _profile_id()
    database = get_database()
    linked = database.execute(
        "SELECT COUNT(*) AS total FROM study_tasks WHERE profile_id = ? AND subject_id = ?",
        (profile_id, subject_id),
    ).fetchone()["total"]
    if linked:
        raise ValueError("Exclua ou altere as tarefas desta matéria primeiro.")
    cursor = database.execute(
        "DELETE FROM study_subjects WHERE id = ? AND profile_id = ?",
        (subject_id, profile_id),
    )
    database.commit()
    return cursor.rowcount > 0


def list_tasks(task_date: str | None = None) -> list[dict]:
    profile_id = _profile_id()
    selected_date = _date(task_date)
    rows = get_database().execute(
        """
        SELECT task.*, subject.name AS subject_name,
               COALESCE((SELECT SUM(session.duration_seconds)
                         FROM study_sessions session
                         WHERE session.task_id = task.id), 0) AS studied_seconds
        FROM study_tasks task
        LEFT JOIN study_subjects subject ON subject.id = task.subject_id
        WHERE task.profile_id = ? AND task.task_date = ?
        ORDER BY task.completed, task.created_at, task.id
        """,
        (profile_id, selected_date),
    ).fetchall()
    return [_task_payload(row) for row in rows]


def create_task(data: dict) -> dict:
    profile_id = _profile_id()
    title = _text(data.get("title"), "O título da tarefa", 100)
    task_type = str(data.get("type") or "Estudo")
    if task_type not in TASK_TYPES:
        raise ValueError("Selecione um tipo de tarefa válido.")
    subject_id = _subject_for_profile(data.get("subjectId"), profile_id)
    task_date = _date(data.get("date"))
    minutes = _minutes(data.get("plannedMinutes"))
    database = get_database()
    cursor = database.execute(
        """
        INSERT INTO study_tasks
            (profile_id, subject_id, title, task_type, task_date, planned_minutes)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (profile_id, subject_id, title, task_type, task_date, minutes),
    )
    database.commit()
    return get_task(int(cursor.lastrowid))


def get_task(task_id: int) -> dict:
    profile_id = _profile_id()
    row = get_database().execute(
        """
        SELECT task.*, subject.name AS subject_name,
               COALESCE((SELECT SUM(session.duration_seconds)
                         FROM study_sessions session
                         WHERE session.task_id = task.id), 0) AS studied_seconds
        FROM study_tasks task
        LEFT JOIN study_subjects subject ON subject.id = task.subject_id
        WHERE task.id = ? AND task.profile_id = ?
        """,
        (task_id, profile_id),
    ).fetchone()
    if row is None:
        raise LookupError("Tarefa não encontrada.")
    return _task_payload(row)


def update_task(task_id: int, data: dict) -> dict:
    current = get_task(task_id)
    profile_id = _profile_id()
    title = _text(data.get("title", current["title"]), "O título da tarefa", 100)
    task_type = str(data.get("type", current["type"]))
    if task_type not in TASK_TYPES:
        raise ValueError("Selecione um tipo de tarefa válido.")
    subject_value = data.get("subjectId", current["subject"]["id"] if current["subject"] else None)
    subject_id = _subject_for_profile(subject_value, profile_id)
    task_date = _date(data.get("date", current["date"]))
    minutes = _minutes(data.get("plannedMinutes", current["plannedMinutes"]))
    completed = data.get("completed", current["completed"])
    if type(completed) is not bool:
        raise ValueError("Informe um estado válido para a tarefa.")
    database = get_database()
    database.execute(
        """
        UPDATE study_tasks
        SET subject_id = ?, title = ?, task_type = ?, task_date = ?,
            planned_minutes = ?, completed = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND profile_id = ?
        """,
        (subject_id, title, task_type, task_date, minutes, int(completed), task_id, profile_id),
    )
    database.commit()
    return get_task(task_id)


def delete_task(task_id: int) -> bool:
    profile_id = _profile_id()
    database = get_database()
    database.execute(
        "DELETE FROM study_sessions WHERE task_id = ? AND profile_id = ?",
        (task_id, profile_id),
    )
    cursor = database.execute(
        "DELETE FROM study_tasks WHERE id = ? AND profile_id = ?",
        (task_id, profile_id),
    )
    database.commit()
    return cursor.rowcount > 0


def record_session(task_id: int, data: dict) -> dict:
    profile_id = _profile_id()
    current = get_task(task_id)
    duration_seconds = _seconds(data.get("durationSeconds"))
    database = get_database()
    database.execute(
        "INSERT INTO study_sessions (profile_id, task_id, duration_seconds) VALUES (?, ?, ?)",
        (profile_id, task_id, duration_seconds),
    )
    new_studied = current["studiedSeconds"] + duration_seconds
    if new_studied >= current["plannedMinutes"] * 60:
        database.execute(
            "UPDATE study_tasks SET completed = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND profile_id = ?",
            (task_id, profile_id),
        )
    database.commit()
    return get_task(task_id)


def sessions_for_date(target_date: str | None = None) -> dict:
    selected_date = _date(target_date)
    profile_id = _profile_id()
    tz_offset = timedelta(seconds=-datetime.now().astimezone().utcoffset().total_seconds()) if datetime.now().astimezone().utcoffset() else timedelta(0)
    local_start = datetime.combine(date.fromisoformat(selected_date), time.min)
    local_end = datetime.combine(date.fromisoformat(selected_date), time.max)
    start_utc = (local_start + tz_offset).isoformat(sep=" ", timespec="seconds")
    end_utc = (local_end + tz_offset).isoformat(sep=" ", timespec="seconds")
    rows = get_database().execute(
        """
        SELECT session.id, session.duration_seconds, session.completed_at,
               task.id AS task_id, task.title AS task_title, task.task_type,
               task.planned_minutes,
               subject.id AS subject_id, subject.name AS subject_name
        FROM study_sessions session
        JOIN study_tasks task ON task.id = session.task_id
        LEFT JOIN study_subjects subject ON subject.id = task.subject_id
        WHERE session.profile_id = ? AND session.completed_at BETWEEN ? AND ?
        ORDER BY task.id, session.completed_at
        """,
        (profile_id, start_utc, end_utc),
    ).fetchall()
    grouped: dict[int, dict] = {}
    for row in rows:
        entry = grouped.setdefault(row["task_id"], {
            "taskId": row["task_id"],
            "title": row["task_title"],
            "type": row["task_type"],
            "subject": {"id": row["subject_id"], "name": row["subject_name"]} if row["subject_id"] else None,
            "plannedMinutes": row["planned_minutes"],
            "studiedSeconds": 0,
            "sessions": [],
        })
        entry["studiedSeconds"] += row["duration_seconds"]
        entry["sessions"].append({
            "id": row["id"],
            "durationSeconds": row["duration_seconds"],
            "completedAt": row["completed_at"],
        })
    return {"date": selected_date, "items": list(grouped.values())}


def overview(task_date: str | None = None) -> dict:
    selected_date = _date(task_date)
    tasks = list_tasks(selected_date)
    completed = sum(1 for task in tasks if task["completed"])
    return {
        "date": selected_date,
        "tasks": tasks,
        "subjects": list_subjects(),
        "completedCount": completed,
        "plannedMinutes": sum(task["plannedMinutes"] for task in tasks),
        "studiedSeconds": sum(task["studiedSeconds"] for task in tasks),
        "focusTask": next((task for task in tasks if not task["completed"]), None),
    }
