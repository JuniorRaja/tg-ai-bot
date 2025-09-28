-- Users table
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id TEXT UNIQUE NOT NULL,
    username TEXT,
    first_name TEXT,
    preferences TEXT DEFAULT '{}',
    timezone TEXT DEFAULT 'UTC',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_active DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Conversations for context
CREATE TABLE conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    message TEXT NOT NULL,
    response TEXT,
    message_type TEXT DEFAULT 'text',
    context_summary TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    tokens_used INTEGER DEFAULT 0
);

-- Tasks and goals
CREATE TABLE tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'medium',
    due_date DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
);

-- Reminders
CREATE TABLE reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    message TEXT NOT NULL,
    remind_at DATETIME NOT NULL,
    status TEXT DEFAULT 'pending',
    recurring TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Habits tracking
CREATE TABLE habits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    habit_name TEXT NOT NULL,
    frequency TEXT DEFAULT 'daily',
    target_count INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Habit entries
CREATE TABLE habit_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    habit_id INTEGER REFERENCES habits(id),
    user_id INTEGER REFERENCES users(id),
    count INTEGER DEFAULT 1,
    notes TEXT,
    logged_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Files and media
CREATE TABLE files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    file_id TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER,
    description TEXT,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_users_telegram_id ON users(telegram_id);
CREATE INDEX idx_conversations_user_timestamp ON conversations(user_id, timestamp);
CREATE INDEX idx_reminders_user_remind_at ON reminders(user_id, remind_at);
CREATE INDEX idx_habits_user_id ON habits(user_id);
CREATE INDEX idx_habit_entries_user_date ON habit_entries(user_id, logged_at);