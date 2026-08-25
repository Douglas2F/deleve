CREATE TABLE IF NOT EXISTS health_profile (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    birth_date TEXT,
    height_cm REAL,
    current_weight_kg REAL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS health_profiles (
 id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, height_cm REAL NOT NULL,
 current_weight_kg REAL NOT NULL, goal TEXT NOT NULL, sleep_goal_hours REAL NOT NULL,
 water_goal_ml INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS health_goals (
 id INTEGER PRIMARY KEY AUTOINCREMENT, profile_id INTEGER NOT NULL,
 goal_type TEXT NOT NULL, target_value REAL, unit TEXT,
 FOREIGN KEY (profile_id) REFERENCES health_profiles (id)
);
