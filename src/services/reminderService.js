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
    const lowerText = text.toLowerCase();
    const hasRemind = lowerText.includes('remind me');

    if (!hasRemind && !lowerText.includes('reminder')) return null;

    // Extract message after "remind me"
    const messagePattern = /remind me(?: to)? (.+)/i;
    const messageMatch = text.match(messagePattern);
    let message = messageMatch ? messageMatch[1].trim() : text.replace(/remind(me|er)\s*/i, '').trim();
    if (!message || message.length < 3) message = text.replace(/remind(me|er)\s*/i, '').trim();

    let remindAt = new Date();

    // Extract time - look for tomorrow, in X hours/days, at time
    if (lowerText.includes('tomorrow')) {
      remindAt.setDate(remindAt.getDate() + 1);
      remindAt.setHours(9, 0, 0, 0); // Default 9 AM
    } else if (lowerText.includes('in') && /\bin (\d+) (hours?|minutes?|days?)/i.test(text)) {
      const timeMatch = text.match(/\bin (\d+) (hours?|minutes?|days?)/i);
      const amount = parseInt(timeMatch[1]);
      const unit = timeMatch[2].toLowerCase();

      if (unit.startsWith('hour')) {
        remindAt.setHours(remindAt.getHours() + amount);
      } else if (unit.startsWith('minute')) {
        remindAt.setMinutes(remindAt.getMinutes() + amount);
      } else if (unit.startsWith('day')) {
        remindAt.setDate(remindAt.getDate() + amount);
      }
    } else if (lowerText.includes('at') && /\bat (\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i.test(text)) {
      const timeMatch = text.match(/\bat (\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
      let hour = parseInt(timeMatch[1]);
      const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const ampm = timeMatch[3];

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
    } else {
      // No time specified, set to tomorrow 9 AM
      remindAt.setDate(remindAt.getDate() + 1);
      remindAt.setHours(9, 0, 0, 0);
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