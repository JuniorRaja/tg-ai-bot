export class HabitTracker {
  constructor(db) {
    this.db = db;
    this.habitPatterns = {
      'exercise': [/went to gym/i, /worked out/i, /exercised/i, /fitness/i, /ran/i, /jogged/i],
      'meditation': [/meditated/i, /meditation/i, /mindfulness/i],
      'reading': [/read/i, /reading/i, /finished.*book/i],
      'water': [/drank.*water/i, /hydrated/i, /water.*bottles/i],
      'sleep': [/slept/i, /went to bed/i, /good night/i, /8 hours/i],
      'coding': [/coded/i, /programming/i, /development/i, /github/i],
      'writing': [/wrote/i, /writing/i, /journal/i, /blog/i]
    };
  }

  async trackFromMessage(message, userId) {
    const detectedHabits = [];
    
    for (const [habitName, patterns] of Object.entries(this.habitPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(message)) {
          detectedHabits.push(habitName);
          break;
        }
      }
    }

    for (const habit of detectedHabits) {
      await this.recordHabit(userId, habit);
    }

    return detectedHabits;
  }

  async recordHabit(userId, habitName) {
    try {
      // Get or create habit
      let habit = await this.db.prepare(`
        SELECT id FROM habits WHERE user_id = ? AND habit_name = ?
      `).bind(userId, habitName).first();

      if (!habit) {
        const result = await this.db.prepare(`
          INSERT INTO habits (user_id, habit_name, frequency)
          VALUES (?, ?, 'daily')
        `).bind(userId, habitName).run();
        habit = { id: result.meta.last_row_id };
      }

      // Record today's entry (if not already exists)
      const today = new Date().toISOString().split('T')[0];
      const existing = await this.db.prepare(`
        SELECT id FROM habit_entries 
        WHERE habit_id = ? AND date(logged_at) = ?
      `).bind(habit.id, today).first();

      if (!existing) {
        await this.db.prepare(`
          INSERT INTO habit_entries (habit_id, user_id, count, logged_at)
          VALUES (?, ?, 1, datetime('now'))
        `).bind(habit.id, userId).run();
      }
    } catch (error) {
      console.error('Error recording habit:', error);
    }
  }

  async getUserHabits(userId) {
    try {
      const habits = await this.db.prepare(`
        SELECT h.habit_name, h.frequency, 
               COUNT(he.id) as total_entries,
               MAX(he.logged_at) as last_logged
        FROM habits h
        LEFT JOIN habit_entries he ON h.id = he.habit_id
        WHERE h.user_id = ?
        GROUP BY h.id, h.habit_name, h.frequency
      `).bind(userId).all();

      return habits.results || [];
    } catch (error) {
      console.error('Error getting habits:', error);
      return [];
    }
  }
}