from datetime import date

from app.core.database import get_database


def save_today_weight(weight_kg: float) -> dict:
    """Cria ou atualiza a pesagem de hoje e devolve o resumo atualizado."""
    try:
        weight = round(float(str(weight_kg).replace(",", ".")), 1)
    except (TypeError, ValueError) as error:
        raise ValueError("Informe um peso válido.") from error
    if not 20 <= weight <= 400:
        raise ValueError("O peso deve ficar entre 20 e 400 kg.")

    database = get_database()
    profile = database.execute(
        "SELECT id FROM health_profiles ORDER BY id DESC LIMIT 1"
    ).fetchone()
    if profile is None:
        raise ValueError("Configure seu perfil antes de registrar o peso.")

    database.execute(
        """
        INSERT INTO health_weight_entries (profile_id, recorded_on, weight_kg)
        VALUES (?, ?, ?)
        ON CONFLICT(profile_id, recorded_on) DO UPDATE SET
            weight_kg = excluded.weight_kg,
            created_at = CURRENT_TIMESTAMP
        """,
        (profile["id"], date.today().isoformat(), weight),
    )
    database.commit()
    return get_weight_summary(int(profile["id"]))


def get_weight_summary(profile_id: int | None = None) -> dict:
    database = get_database()
    if profile_id is None:
        profile = database.execute(
            """
            SELECT id, current_weight_kg, date(created_at, 'localtime') AS initial_date
            FROM health_profiles ORDER BY id DESC LIMIT 1
            """
        ).fetchone()
    else:
        profile = database.execute(
            """
            SELECT id, current_weight_kg, date(created_at, 'localtime') AS initial_date
            FROM health_profiles WHERE id = ?
            """,
            (profile_id,),
        ).fetchone()
    if profile is None:
        raise ValueError("Configure seu perfil antes de acompanhar o peso.")

    rows = database.execute(
        """
        SELECT recorded_on, weight_kg
        FROM health_weight_entries
        WHERE profile_id = ?
        ORDER BY recorded_on DESC, id DESC
        LIMIT 12
        """,
        (profile["id"],),
    ).fetchall()
    history = [
        {"recordedOn": row["recorded_on"], "weightKg": row["weight_kg"]}
        for row in rows
    ]
    initial_weight = float(profile["current_weight_kg"])
    initial_date = profile["initial_date"]
    if not any(entry["recordedOn"] == initial_date for entry in history):
        history.append({"recordedOn": initial_date, "weightKg": initial_weight})
    history = sorted(history, key=lambda entry: entry["recordedOn"], reverse=True)[:12]
    current_weight = float(rows[0]["weight_kg"]) if rows else initial_weight
    return {
        "initialDate": initial_date,
        "initialWeightKg": initial_weight,
        "currentWeightKg": current_weight,
        "changeKg": round(current_weight - initial_weight, 1),
        "history": history,
    }
