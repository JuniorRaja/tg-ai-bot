-- Health tracking tables

-- General health logs table for various health metrics
CREATE TABLE health_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    log_type TEXT NOT NULL, -- 'meal', 'mood', 'fitness', 'water', 'sleep', etc.
    value TEXT, -- JSON string with structured data
    notes TEXT,
    logged_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Meals specific table for detailed meal tracking
CREATE TABLE meals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    meal_type TEXT DEFAULT 'meal', -- breakfast, lunch, dinner, snack
    description TEXT,
    calories INTEGER,
    nutrients TEXT, -- JSON with protein, carbs, fat, etc.
    logged_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Mood entries
CREATE TABLE mood_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    mood_level INTEGER, -- 1-10 scale
    mood_type TEXT, -- happy, sad, anxious, etc.
    notes TEXT,
    triggers TEXT, -- what caused this mood
    logged_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Daily summaries
CREATE TABLE daily_summaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    summary_date DATE, -- date only
    health_overview TEXT, -- JSON with health metrics
    tasks_completed INTEGER DEFAULT 0,
    habits_completed INTEGER DEFAULT 0,
    mood_average REAL,
    overall_score INTEGER, -- 1-100 scale
    reflection_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, summary_date) -- unique per user per date
);

-- User reflections table
CREATE TABLE user_reflections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    reflection_date DATE,
    responses TEXT, -- JSON with question-answer pairs
    overall_rating INTEGER, -- user's self-rating 1-10
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, reflection_date) -- unique per user per date
);

-- Indexes
CREATE INDEX idx_health_logs_user_type_date ON health_logs(user_id, log_type, date(logged_at));
CREATE INDEX idx_meals_user_date ON meals(user_id, date(logged_at));
CREATE INDEX idx_mood_entries_user_date ON mood_entries(user_id, date(logged_at));
CREATE INDEX idx_daily_summaries_user_date ON daily_summaries(user_id, summary_date);
CREATE INDEX idx_user_reflections_user_date ON user_reflections(user_id, reflection_date);
