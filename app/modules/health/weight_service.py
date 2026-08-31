from datetime import date, timedelta

from app.core.database import get_database


def get_weight_chart(period="30", reference_date=None):
    if period not in ("30", "90", "all"):
        raise ValueError("Escolha 30 dias, 90 dias ou todo o histórico.")
    today = reference_date or date.today()
    start = today - timedelta(days=int(period) - 1) if period != "all" else date.min
    database = get_database()
    profile = database.execute("SELECT id, goal FROM health_profiles ORDER BY id DESC LIMIT 1").fetchone()
    if profile is None:
        raise ValueError("Configure seu perfil antes de acompanhar o peso.")
    rows = database.execute("SELECT id, recorded_on, weight_kg FROM health_weight_entries WHERE profile_id = ? AND recorded_on BETWEEN ? AND ? ORDER BY recorded_on, id",
                            (profile["id"], start.isoformat(), today.isoformat())).fetchall()
    goals = {item.strip() for item in profile["goal"].split(",")}
    target = None
    if ("Perder peso" in goals) != ("Ganhar peso" in goals) and "Manter peso" not in goals:
        goal = "Perder peso" if "Perder peso" in goals else "Ganhar peso"
        row = database.execute("SELECT target_value FROM health_goals WHERE profile_id = ? AND goal_type = ? ORDER BY id DESC LIMIT 1", (profile["id"], goal)).fetchone()
        try:
            value = float(row["target_value"]) if row else 0
            if 20 <= value <= 400:
                target = value
        except (ValueError, TypeError):
            pass
    return {"period": period, "startDate": (rows[0]["recorded_on"] if rows else today.isoformat()) if period == "all" else start.isoformat(),
            "endDate": today.isoformat(), "targetWeightKg": target,
            "points": [{"id": row["id"], "recordedOn": row["recorded_on"], "weightKg": row["weight_kg"]} for row in rows]}


def _validated_weight(weight_kg) -> float:
    try:
        weight = round(float(str(weight_kg).replace(",", ".")), 1)
    except (TypeError, ValueError) as error:
        raise ValueError("Informe um peso válido.") from error
    if not 20 <= weight <= 400:
        raise ValueError("O peso deve ficar entre 20 e 400 kg.")
    return weight


class WeightDateConflict(ValueError):
    def __init__(self, entry):
        super().__init__("Já existe uma pesagem nesta data. Edite o registro existente para corrigir o valor.")
        self.entry = {"id": entry["id"], "recordedOn": entry["recorded_on"], "weightKg": entry["weight_kg"]}


def save_today_weight(weight_kg: float, recorded_on=None) -> dict:
    """Create one measurement on the selected day; never silently overwrite."""
    weight = _validated_weight(weight_kg)
    if recorded_on is None:
        selected_date = date.today()
    else:
        try:
            selected_date = date.fromisoformat(recorded_on)
            if selected_date.isoformat() != recorded_on:
                raise ValueError()
        except (TypeError, ValueError) as error:
            raise ValueError("Informe uma data válida para a pesagem.") from error
    if selected_date > date.today():
        raise ValueError("Não é possível registrar peso em uma data futura.")
    database = get_database()
    database.execute("BEGIN IMMEDIATE")
    try:
        profile = database.execute("SELECT id FROM health_profiles ORDER BY id DESC LIMIT 1").fetchone()
        if profile is None:
            raise ValueError("Configure seu perfil antes de registrar o peso.")
        existing = database.execute("SELECT id, recorded_on, weight_kg FROM health_weight_entries WHERE profile_id = ? AND recorded_on = ?", (profile["id"], selected_date.isoformat())).fetchone()
        if existing is not None:
            raise WeightDateConflict(existing)
        database.execute("INSERT INTO health_weight_entries (profile_id, recorded_on, weight_kg) VALUES (?, ?, ?)", (profile["id"], selected_date.isoformat(), weight))
        database.commit()
    except Exception:
        database.rollback()
        raise
    return {**get_weight_summary(int(profile["id"])), "savedDate": selected_date.isoformat(), "isToday": selected_date == date.today()}


def change_weight_entry(entry_id: int, weight_kg=None, *, delete=False) -> dict:
    """Correct only an existing measurement owned by the active profile."""
    weight = None if delete else _validated_weight(weight_kg)
    database = get_database()
    database.execute("BEGIN IMMEDIATE")
    try:
        profile = database.execute("SELECT id FROM health_profiles ORDER BY id DESC LIMIT 1").fetchone()
        if profile is None:
            raise ValueError("Configure seu perfil antes de alterar pesagens.")
        entry = database.execute("SELECT id FROM health_weight_entries WHERE id = ? AND profile_id = ?", (entry_id, profile["id"])).fetchone()
        if entry is None:
            raise LookupError("Pesagem não encontrada. Atualize o histórico.")
        if delete:
            database.execute("DELETE FROM health_weight_entries WHERE id = ? AND profile_id = ?", (entry_id, profile["id"]))
        else:
            # Correction preserves the original date and timestamp, not a new activity.
            database.execute("UPDATE health_weight_entries SET weight_kg = ? WHERE id = ? AND profile_id = ?", (weight, entry_id, profile["id"]))
        database.commit()
    except Exception:
        database.rollback()
        raise
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
        SELECT id, recorded_on, weight_kg
        FROM health_weight_entries
        WHERE profile_id = ?
        ORDER BY recorded_on DESC, id DESC
        """,
        (profile["id"],),
    ).fetchall()
    history = [
        {"id": row["id"], "recordedOn": row["recorded_on"], "weightKg": row["weight_kg"], "isInitial": False}
        for row in rows
    ]
    initial_weight = float(profile["current_weight_kg"])
    initial_date = profile["initial_date"]
    if not any(entry["recordedOn"] == initial_date for entry in history):
        history.append({"id": None, "recordedOn": initial_date, "weightKg": initial_weight, "isInitial": True})
    history = sorted(history, key=lambda entry: entry["recordedOn"], reverse=True)
    current_weight = float(rows[0]["weight_kg"]) if rows else initial_weight
    return {
        "initialDate": initial_date,
        "initialWeightKg": initial_weight,
        "currentWeightKg": current_weight,
        "changeKg": round(current_weight - initial_weight, 1),
        "history": history,
    }
