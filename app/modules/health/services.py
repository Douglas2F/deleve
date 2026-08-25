from app.core.database import get_database


def create_profile(data: dict) -> int:
    name = str(data.get("name", "")).strip()
    goals = data.get("goals", [])
    if not isinstance(goals, list): raise ValueError("Selecione objetivos válidos.")
    goals = [str(item).strip() for item in goals if str(item).strip()]
    goal = ", ".join(goals)
    height = float(data.get("heightCm", 0))
    weight = float(data.get("weightKg", 0))
    sleep = float(data.get("sleepGoalHours", 0) or 0)
    water = int(data.get("waterGoalMl", 0) or 0)
    if not name or not goal: raise ValueError("Nome e objetivo são obrigatórios.")
    if not 80 <= height <= 250: raise ValueError("Informe uma altura válida.")
    if not 20 <= weight <= 400: raise ValueError("Informe um peso válido.")
    if "Dormir melhor" in goals and not 4 <= sleep <= 12: raise ValueError("A meta de sono deve ficar entre 4 e 12 horas.")
    if "Beber mais água" in goals and not 500 <= water <= 6000: raise ValueError("A meta de água deve ficar entre 500 e 6000 ml.")
    database = get_database()
    cursor = database.execute("INSERT INTO health_profiles (name,height_cm,current_weight_kg,goal,sleep_goal_hours,water_goal_ml) VALUES (?,?,?,?,?,?)", (name,height,weight,goal,sleep,water))
    database.commit()
    targets = {"Perder peso": (data.get("targetWeightKg"), "kg"), "Ganhar peso": (data.get("targetWeightKg"), "kg"), "Dormir melhor": (sleep, "horas/dia"), "Beber mais água": (water, "ml/dia"), "Praticar atividade física": (data.get("exerciseDaysWeek"), "dias/semana")}
    for selected in goals:
        value, unit = targets.get(selected, (None, None))
        database.execute("INSERT INTO health_goals (profile_id,goal_type,target_value,unit) VALUES (?,?,?,?)", (cursor.lastrowid, selected, value or None, unit))
    database.commit()
    return int(cursor.lastrowid)


def get_latest_profile() -> dict | None:
    row = get_database().execute(
        "SELECT name, height_cm, current_weight_kg, goal, sleep_goal_hours, water_goal_ml FROM health_profiles ORDER BY id DESC LIMIT 1"
    ).fetchone()
    if row is None:
        return None
    return {
        "name": row["name"], "heightCm": row["height_cm"],
        "weightKg": row["current_weight_kg"], "goal": row["goal"], "goals": [item.strip() for item in row["goal"].split(",")],
        "sleepGoalHours": row["sleep_goal_hours"], "waterGoalMl": row["water_goal_ml"],
    }
