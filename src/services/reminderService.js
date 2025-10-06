export class ReminderService {
  constructor(db) {
    this.db = db;
  }

  // Reminder creation
  async createReminder(message, userId, aiAdapter) {
    const reminderContext = await this.parseReminderContext(message, aiAdapter);

    if (!reminderContext) return null;

    const result = await this.db
      .prepare(
        `
      INSERT INTO reminders (user_id, description, remind_at, status, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `
      )
      .bind(userId, reminderContext.description, reminderContext.remindAt, 'pending', reminderContext.notes || null)
      .run();

    return {
      id: result.meta.last_row_id,
      ...reminderContext,
      status: 'pending'
    };
  }

  // Reminder modification
  async modifyReminder(userId, message, aiAdapter) {
    const modifyContext = await this.parseReminderContext(message, aiAdapter);
    if (!modifyContext || modifyContext.intent !== 'modify_reminder') return null;

    try {
      console.log('Looking for reminder:', modifyContext.reminderTitle, 'for user:', userId);

      // Find reminder by description
      const reminders = await this.db
        .prepare(
          `
        SELECT * FROM reminders
        WHERE user_id = ? AND description LIKE ?
        ORDER BY created_at DESC
        LIMIT 1
      `
        )
        .bind(userId, `%${modifyContext.reminderTitle}%`)
        .all();

      console.log('Found reminders:', reminders.results.length);

      if (reminders.results.length === 0) {
        return {
          success: false,
          message: `No reminder found with description containing "${modifyContext.reminderTitle}"`
        };
      }

      const reminder = reminders.results[0];
      console.log('Updating reminder:', reminder.description, 'with action:', modifyContext.action);
      let updateData = { updated_at: new Date() };

      switch (modifyContext.action) {
        case 'reschedule':
          updateData.remind_at = modifyContext.newValue;
          updateData.status = 'pending';
          break;
        case 'rename':
          updateData.description = modifyContext.newValue;
          break;
        case 'add_notes':
          updateData.notes = modifyContext.notes;
          break;
        case 'complete':
          updateData.status = 'completed';
          updateData.completed_at = new Date();
          break;
        case 'cancel':
          updateData.status = 'cancelled';
          updateData.cancelled_at = new Date();
          break;
        default:
          return { success: false, message: 'Unknown action' };
      }

      const setClause = Object.keys(updateData)
        .map((key) => `${key} = ?`)
        .join(', ');
      const values = Object.values(updateData);

      await this.db
        .prepare(
          `
        UPDATE reminders SET ${setClause} WHERE id = ?
      `
        )
        .bind(...values, reminder.id)
        .run();

      const actionText = {
        reschedule: 'rescheduled',
        rename: 'renamed',
        add_notes: 'updated',
        complete: 'completed',
        cancel: 'cancelled'
      };

      return {
        success: true,
        message: `Reminder "${reminder.description}" has been ${
          actionText[modifyContext.action] || modifyContext.action + 'd'
        } successfully`
      };
    } catch (error) {
      console.error('Error updating reminder:', error);
      return { success: false, message: 'Failed to update reminder' };
    }
  }

  // Reports workflow
  async getUserReminders(userId, filter = 'pending') {
    try {
      let whereClause = 'WHERE user_id = ?';
      let bindParams = [userId];

      if (filter === 'today') {
        const now = new Date();
        const today = now.getFullYear() + '-' +
                     String(now.getMonth() + 1).padStart(2, '0') + '-' +
                     String(now.getDate()).padStart(2, '0');
        whereClause += ' AND DATE(remind_at) = DATE(?) AND status = "pending"';
        bindParams.push(today);
      } else if (filter !== 'all') {
        whereClause += ' AND status = ?';
        bindParams.push(filter);
      }

      console.log('Filter query:', `SELECT * FROM reminders ${whereClause} ORDER BY remind_at ASC`);
      console.log('Bind params:', bindParams);

      const reminders = await this.db
        .prepare(
          `
        SELECT * FROM reminders ${whereClause}
        ORDER BY remind_at ASC
      `
        )
        .bind(...bindParams)
        .all();

      console.log('Query results:', reminders.results.length, 'reminders');
      return reminders.results;
    } catch (error) {
      console.error('Error fetching reminders:', error);
      return [];
    }
  }

  // Content extraction with AI
  async parseReminderContext(message, aiAdapter) {
    try {
      const now = new Date();
      const timeContext = {
        time: now.toLocaleTimeString('en-US', { hour12: false }),
        day: now.toLocaleDateString('en-US', { weekday: 'long' }),
        date: now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };

      const reminderPrompt = this.getReminderPrompt(timeContext);
      console.log('Reminder prompt for AI :', reminderPrompt);
      const aiResponse = await aiAdapter.generateJsonResponse(reminderPrompt, message, {
        temperature: 0.1,
        maxTokens: 300
      });

      // Clean the response to extract only JSON
      let jsonContent = aiResponse.content.trim();

      // Remove any conversational text before JSON
      const jsonStart = jsonContent.indexOf('{');
      const jsonEnd = jsonContent.lastIndexOf('}');

      if (jsonStart === -1 || jsonEnd === -1 || jsonStart >= jsonEnd) {
        console.error('No valid JSON object found in AI response:', jsonContent);
        return null;
      }

      jsonContent = jsonContent.substring(jsonStart, jsonEnd + 1);

      let context;
      try {
        context = JSON.parse(jsonContent);
      } catch (parseError) {
        console.error('JSON parse error:', parseError.message);
        console.error('Attempted to parse:', jsonContent);
        return null;
      }

      // Validate and return create_reminder context
      if (context.intent === 'create_reminder' && context.confidence >= 60) {
        if (!context.description || !context.remindAt) {
          console.error('Missing required fields for create_reminder:', context);
          return null;
        }

        return {
          description: context.description,
          remindAt: context.remindAt,
          notes: context.notes || null
        };
      }

      // Validate and return modify_reminder context
      if (context.intent === 'modify_reminder' && context.confidence >= 60) {
        if (!context.reminderTitle || !context.action) {
          console.error('Missing required fields for modify_reminder:', context);
          return null;
        }
        return {
          intent: context.intent,
          reminderTitle: context.reminderTitle,
          action: context.action,
          newValue: context.newValue || null,
          notes: context.notes || null
        };
      }

      return null;
    } catch (error) {
      console.error('AI context parsing failed:', error);
      return null;
    }
  }

  getReminderPrompt(timeContext) {
    return `You are a JSON-only API. Analyze the user's message and return ONLY valid JSON.
    No explanations, no conversational text.

    CRITICAL: Respond with VALID JSON OBJECT only. Do not include any text before or after the JSON.
    Use the current Time & Date context to determine the reminder time from the user message.

    Current Context:
    - Date: ${timeContext.date}
    - Day: ${timeContext.day}
    - Time: ${timeContext.time}
    - ISO: ${timeContext.iso}
    - Timezone: ${timeContext.timezone}

    RESPONSE MUST BE VALID JSON OBJECT:

    {
      "intent": "create_reminder|modify_reminder|not_reminder",
      "confidence": 0-100,
      "description": "Full reminder description (only if intent is create_reminder)",
      "remindAt": "Local date-time string (only if intent is create_reminder)",
      "notes": "Additional context (only if intent is create_reminder)",
      "reminderTitle": "Name/description to modify (only if intent is modify_reminder)",
      "action": "reschedule|rename|add_notes|complete|cancel (only if intent is modify_reminder)",
      "newValue": "New value (only if intent is modify_reminder)"
    }

    EXAMPLES (using current timezone context):
    {"intent": "create_reminder", "confidence": 85, "description": "Call mom", "remindAt": "2025-10-06 15:00:00", "notes": "Don't forget"}
    {"intent": "modify_reminder", "confidence": 90, "reminderTitle": "Call mom", "action": "reschedule", "newValue": "2025-10-07 15:00:00"}
    {"intent": "not_reminder", "confidence": 0}

    INVALID: Do not return any text like "I've got this" or "Got it". ONLY JSON.`;
  }
}
