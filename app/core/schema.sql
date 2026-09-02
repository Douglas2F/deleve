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
 water_goal_ml INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 water_portion_ml INTEGER NOT NULL DEFAULT 250 CHECK (water_portion_ml BETWEEN 50 AND 2000)
);

CREATE TABLE IF NOT EXISTS health_goals (
 id INTEGER PRIMARY KEY AUTOINCREMENT, profile_id INTEGER NOT NULL,
 goal_type TEXT NOT NULL, target_value REAL, unit TEXT,
 FOREIGN KEY (profile_id) REFERENCES health_profiles (id)
);

CREATE TABLE IF NOT EXISTS health_water_entries (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 profile_id INTEGER NOT NULL,
 amount_ml INTEGER NOT NULL CHECK (amount_ml > 0),
 recorded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (profile_id) REFERENCES health_profiles (id)
);

CREATE INDEX IF NOT EXISTS idx_health_water_entries_profile_date
ON health_water_entries (profile_id, recorded_at);

CREATE TABLE IF NOT EXISTS health_sleep_entries (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 profile_id INTEGER NOT NULL,
 sleep_date TEXT NOT NULL,
 bedtime TEXT NOT NULL,
 wake_time TEXT NOT NULL,
 duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (profile_id) REFERENCES health_profiles (id),
 UNIQUE (profile_id, sleep_date)
);

CREATE TABLE IF NOT EXISTS health_exercise_entries (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 profile_id INTEGER NOT NULL,
 exercise_date TEXT NOT NULL,
 exercise_type TEXT NOT NULL,
 duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
 distance_km REAL CHECK (distance_km IS NULL OR distance_km > 0),
 calories_burned INTEGER CHECK (calories_burned IS NULL OR calories_burned > 0),
 note TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (profile_id) REFERENCES health_profiles (id)
);

CREATE TABLE IF NOT EXISTS health_weight_entries (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 profile_id INTEGER NOT NULL,
 recorded_on TEXT NOT NULL,
 weight_kg REAL NOT NULL CHECK (weight_kg > 0),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (profile_id) REFERENCES health_profiles (id),
 UNIQUE (profile_id, recorded_on)
);

CREATE TABLE IF NOT EXISTS health_daily_focus (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 profile_id INTEGER NOT NULL,
 focus_date TEXT NOT NULL,
 focus_text TEXT NOT NULL,
 completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1)),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (profile_id) REFERENCES health_profiles (id),
 UNIQUE (profile_id, focus_date)
);

CREATE TABLE IF NOT EXISTS study_subjects (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 profile_id INTEGER NOT NULL,
 name TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (profile_id) REFERENCES health_profiles (id),
 UNIQUE (profile_id, name)
);

CREATE TABLE IF NOT EXISTS study_tasks (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 profile_id INTEGER NOT NULL,
 subject_id INTEGER,
 title TEXT NOT NULL,
 task_type TEXT NOT NULL DEFAULT 'Estudo',
 task_date TEXT NOT NULL,
 planned_minutes INTEGER NOT NULL CHECK (planned_minutes BETWEEN 5 AND 480),
 completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1)),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (profile_id) REFERENCES health_profiles (id),
 FOREIGN KEY (subject_id) REFERENCES study_subjects (id)
);

CREATE INDEX IF NOT EXISTS idx_study_tasks_profile_date
ON study_tasks (profile_id, task_date);

CREATE TABLE IF NOT EXISTS study_sessions (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 profile_id INTEGER NOT NULL,
 task_id INTEGER NOT NULL,
 duration_seconds INTEGER NOT NULL CHECK (duration_seconds BETWEEN 1 AND 28800),
 completed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (profile_id) REFERENCES health_profiles (id),
 FOREIGN KEY (task_id) REFERENCES study_tasks (id)
);

CREATE INDEX IF NOT EXISTS idx_study_sessions_task
ON study_sessions (task_id, completed_at);
