-- Migration: Reset reminders table (drop and recreate)
-- This migration drops the existing reminders table and recreates it with the current schema

DROP TABLE IF EXISTS reminders;

CREATE TABLE reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    description TEXT NOT NULL,
    remind_at DATETIME NOT NULL,
    status TEXT DEFAULT 'pending',
    recurring TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    cancelled_at DATETIME
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reminders_user_remind_at ON reminders(user_id, remind_at);
CREATE INDEX IF NOT EXISTS idx_reminders_user_status ON reminders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_reminders_status_remind_at ON reminders(status, remind_at);