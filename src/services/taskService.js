export class TaskService {
  constructor(db) {
    this.db = db;
  }

  async parseAndCreateTask(message, userId) {
    const taskData = this.parseNaturalLanguage(message);
    if (!taskData) return null;

    try {
      const result = await this.db.prepare(`
        INSERT INTO tasks (user_id, title, description, priority)
        VALUES (?, ?, ?, 'medium')
      `).bind(userId, taskData.title, taskData.description).run();

      return {
        id: result.meta.last_row_id,
        title: taskData.title,
        description: taskData.description
      };
    } catch (error) {
      console.error('Error creating task:', error);
      return null;
    }
  }

  parseNaturalLanguage(text) {
    const lowerText = text.toLowerCase();
    const hasTask = lowerText.includes('task') ||
      lowerText.includes('add') && lowerText.includes('to') ||
      lowerText.includes('need to') ||
      lowerText.includes('have to') ||
      lowerText.includes('should') ||
      lowerText.includes('must') ||
      lowerText.includes('todo');

    if (!hasTask) return null;

    // Extract task content
    const patterns = [
      /(?:add|create)\s+(?:a\s+)?task(?:\s+to|:?\s*)(.+?)(?:\n|$)/i,
      /(?:need|have|want) to (.+?)(?:\n|$|>|$)/i,
      /(?:should|must|have to|need to) (.+?)(?:\n|$|>|$)/i,
      /task:\s*(.+?)(?:\n|$)/i,
      /todo:\s*(.+?)(?:\n|$)/i
    ];

    let content = null;
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        content = match[1].trim();
        break;
      }
    }

    if (!content) {
      // Fallback: remove keywords and take the rest
      content = text.replace(/(?:add|create|need|have|want|should|must)\s+(?:a\s+)?(task|todo|:?)\s*/i, '').trim();
    }

    if (!content || content.length < 2) return null;

    const title = content.split(/[.!?]/)[0].trim() || content;

    return {
      title: title.length > 50 ? title.substring(0, 50) + '...' : title,
      description: content
    };
  }

  async getUserTasks(userId) {
    try {
      const tasks = await this.db.prepare(`
        SELECT * FROM tasks
        WHERE user_id = ? AND status = 'pending'
        ORDER BY created_at DESC
        LIMIT 10
      `).bind(userId).all();

      return tasks.results || [];
    } catch (error) {
      console.error('Error getting tasks:', error);
      return [];
    }
  }
}
