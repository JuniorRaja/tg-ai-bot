export class ContextManager {
  constructor(db, kv) {
    this.db = db;
    this.kv = kv;
    this.maxContextMessages = 20;
  }

  async getContext(userId) {
    try {
      // Get recent conversations from D1
      const conversations = await this.db.prepare(`
        SELECT message, response, timestamp 
        FROM conversations 
        WHERE user_id = ? 
        ORDER BY timestamp DESC 
        LIMIT ?
      `).bind(userId, this.maxContextMessages).all();

      const recentMessages = conversations.results.map(conv => ({
        user: conv.message,
        assistant: conv.response,
        timestamp: conv.timestamp
      }));

      // Get user preferences from KV (cached) - only if KV is available
      const userPrefs = this.kv ? await this.kv.get(`user_prefs_${userId}`, 'json') || {} : {};

      return {
        recentMessages: recentMessages.reverse(),
        userPreferences: userPrefs
      };
    } catch (error) {
      console.error('Error getting context:', error);
      return { recentMessages: [], userPreferences: {} };
    }
  }

  async saveConversation(userId, message, response) {
    try {
      await this.db.prepare(`
        INSERT INTO conversations (user_id, message, response, timestamp)
        VALUES (?, ?, ?, datetime('now'))
      `).bind(userId, message, response).run();

      // Clean old conversations (keep only last 50)
      await this.db.prepare(`
        DELETE FROM conversations 
        WHERE user_id = ? AND id NOT IN (
          SELECT id FROM conversations 
          WHERE user_id = ? 
          ORDER BY timestamp DESC 
          LIMIT 50
        )
      `).bind(userId, userId).run();
    } catch (error) {
      console.error('Error saving conversation:', error);
    }
  }
}