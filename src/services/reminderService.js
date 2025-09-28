export class ReminderService {
  constructor(db) {
    this.db = db;
  }

  async parseAndCreateReminder(message, userId) {
    const reminderData = this.parseNaturalLanguage(message);
    if (!reminderData) return null;

    try {
      const result = await this.db.prepare(`
        INSERT INTO reminders (user_id, message, remind_at, status)
        VALUES (?, ?, ?, 'pending')
      `).bind(userId, reminderData.message, reminderData.remindAt).run();

      return {
        id: result.meta.last_row_id,
        message: reminderData.message,
        remind_at: reminderData.remindAt
      };
    } catch (error) {
      console.error('Error creating reminder:', error);
      return null;
    }
  }

  parseNaturalLanguage(text) {
    // Simple natural language parsing - can be enhanced
    const reminderPattern = /remind me to (.+?) (?:tomorrow|in (\d+) (hours?|minutes?|days?)|at (\d+):?(\d+)?\s*(am|pm)?)/i;
    const match = text.match(reminderPattern);
    
    if (!match) return null;

    const message = match[1].trim();
    let remindAt = new Date();

    if (text.includes('tomorrow')) {
      remindAt.setDate(remindAt.getDate() + 1);
      remindAt.setHours(9, 0, 0, 0); // Default to 9 AM
    } else if (match[2]) {
      const amount = parseInt(match[2]);
      const unit = match[3].toLowerCase();
      
      if (unit.startsWith('hour')) {
        remindAt.setHours(remindAt.getHours() + amount);
      } else if (unit.startsWith('minute')) {
        remindAt.setMinutes(remindAt.getMinutes() + amount);
      } else if (unit.startsWith('day')) {
        remindAt.setDate(remindAt.getDate() + amount);
      }
    } else if (match[4]) {
      let hour = parseInt(match[4]);
      const minute = parseInt(match[5]) || 0;
      const ampm = match[6];
      
      if (ampm && ampm.toLowerCase() === 'pm' && hour !== 12) {
        hour += 12;
      } else if (ampm && ampm.toLowerCase() === 'am' && hour === 12) {
        hour = 0;
      }
      
      remindAt.setHours(hour, minute, 0, 0);
      
      // If time has passed today, set for tomorrow
      if (remindAt < new Date()) {
        remindAt.setDate(remindAt.getDate() + 1);
      }
    }

    return {
      message: message,
      remindAt: remindAt.toISOString()
    };
  }

  async processScheduledTasks(env) {
    try {
      const now = new Date().toISOString();
      const pendingReminders = await env.DB.prepare(`
        SELECT r.*, u.telegram_id 
        FROM reminders r
        JOIN users u ON r.user_id = u.id
        WHERE r.status = 'pending' AND r.remind_at <= ?
      `).bind(now).all();

      for (const reminder of pendingReminders.results) {
        // Send reminder message
        await this.sendReminderMessage(reminder, env.TELEGRAM_BOT_TOKEN);
        
        // Mark as completed
        await env.DB.prepare(`
          UPDATE reminders SET status = 'completed' WHERE id = ?
        `).bind(reminder.id).run();
      }
    } catch (error) {
      console.error('Error processing scheduled tasks:', error);
    }
  }

  async sendReminderMessage(reminder, botToken) {
    const message = `⏰ **Reminder**\n\n${reminder.message}`;
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: reminder.telegram_id,
        text: message,
        parse_mode: 'Markdown'
      })
    });
  }
}