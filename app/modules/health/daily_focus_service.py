from datetime import date

from app.core.database import get_database


def get_today_focus() -> dict | None:
    row = get_database().execute(
        """
        SELECT focus_text, completed
        FROM health_daily_focus
        WHERE profile_id = (SELECT id FROM health_profiles ORDER BY id DESC LIMIT 1)
          AND focus_date = ?
        """,
        (date.today().isoformat(),),
    ).fetchone()
    if row is None:
        return None
    return {"text": row["focus_text"], "completed": bool(row["completed"])}


def save_today_focus(text: str) -> dict:
    normalized = " ".join(str(text or "").strip().split())
    if not 3 <= len(normalized) <= 100:
        raise ValueError("Escreva um foco usando entre 3 e 100 caracteres.")
    database = get_database()
    profile = database.execute(
        "SELECT id FROM health_profiles ORDER BY id DESC LIMIT 1"
    ).fetchone()
    if profile is None:
        raise ValueError("Configure seu perfil antes de definir o foco do dia.")
    database.execute(
        """
        INSERT INTO health_daily_focus (profile_id, focus_date, focus_text)
        VALUES (?, ?, ?)
        ON CONFLICT(profile_id, focus_date) DO UPDATE SET
            focus_text = excluded.focus_text,
            completed = 0,
            updated_at = CURRENT_TIMESTAMP
        """,
        (profile["id"], date.today().isoformat(), normalized),
    )
    database.commit()
    return {"text": normalized, "completed": False}


def set_today_focus_completed(completed: bool) -> dict:
    database = get_database()
    cursor = database.execute(
        """
        UPDATE health_daily_focus
        SET completed = ?, updated_at = CURRENT_TIMESTAMP
        WHERE profile_id = (SELECT id FROM health_profiles ORDER BY id DESC LIMIT 1)
          AND focus_date = ?
        """,
        (int(bool(completed)), date.today().isoformat()),
    )
    if cursor.rowcount == 0:
        raise ValueError("Defina seu foco do dia antes de concluí-lo.")
    database.commit()
    return {"completed": bool(completed)}


def delete_today_focus() -> bool:
    database = get_database()
    cursor = database.execute(
        """
        DELETE FROM health_daily_focus
        WHERE profile_id = (SELECT id FROM health_profiles ORDER BY id DESC LIMIT 1)
          AND focus_date = ?
        """,
        (date.today().isoformat(),),
    )
    database.commit()
    return cursor.rowcount > 0
