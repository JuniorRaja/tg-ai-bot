export class ReportGenerator {
  constructor(db) {
    this.db = db;
  }

  async generateDailyReport(userId) {
    try {
      const now = new Date();
      const today = now.getFullYear() + '-' +
                   String(now.getMonth() + 1).padStart(2, '0') + '-' +
                   String(now.getDate()).padStart(2, '0');
      
      // Get today's activities
      const conversations = await this.db.prepare(`
        SELECT COUNT(*) as message_count
        FROM conversations 
        WHERE user_id = ? AND date(timestamp) = ?
      `).bind(userId, today).first();

      // Get today's habits
      const habits = await this.db.prepare(`
        SELECT h.habit_name, he.count, he.notes
        FROM habit_entries he
        JOIN habits h ON he.habit_id = h.id
        WHERE he.user_id = ? AND date(he.logged_at) = ?
      `).bind(userId, today).all();

      // Get pending reminders
      const reminders = await this.db.prepare(`
        SELECT COUNT(*) as pending_count
        FROM reminders
        WHERE user_id = ? AND status = 'pending' AND date(remind_at) = ?
      `).bind(userId, today).first();

      // Get tasks
      const tasks = await this.db.prepare(`
        SELECT COUNT(*) as total_tasks,
               SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks
        FROM tasks
        WHERE user_id = ? AND (date(created_at) = ? OR date(completed_at) = ?)
      `).bind(userId, today, today).first();

      return this.formatDailyReport({
        messageCount: conversations?.message_count || 0,
        habits: habits.results || [],
        pendingReminders: reminders?.pending_count || 0,
        tasks: tasks || { total_tasks: 0, completed_tasks: 0 }
      });
    } catch (error) {
      console.error('Error generating daily report:', error);
      return "Sorry, I couldn't generate your daily report right now.";
    }
  }

  formatDailyReport(data) {
    const { messageCount, habits, pendingReminders, tasks } = data;
    const date = new Date().toLocaleDateString();
    
    let report = `📊 **Daily Report - ${date}**\n\n`;
    
    // Conversation activity
    report += `💬 **Activity**: ${messageCount} messages exchanged\n`;
    
    // Habits
    if (habits.length > 0) {
      report += `\n💪 **Habits Completed Today**:\n`;
      habits.forEach(habit => {
        report += `• ${habit.habit_name}${habit.notes ? ` (${habit.notes})` : ''}\n`;
      });
    } else {
      report += `\n💪 **Habits**: No habits tracked today\n`;
    }
    
    // Tasks
    if (tasks.total_tasks > 0) {
      report += `\n✅ **Tasks**: ${tasks.completed_tasks}/${tasks.total_tasks} completed\n`;
    }
    
    // Reminders
    if (pendingReminders > 0) {
      report += `\n⏰ **Reminders**: ${pendingReminders} pending\n`;
    }
    
    // Motivational message
    const motivationalMessages = [
      "Great job staying productive! 🌟",
      "Keep up the excellent work! 💪",
      "You're making progress every day! 🚀",
      "Proud of your consistency! 🏆",
      "Another day of growth! 🌱"
    ];
    
    report += `\n${motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)]}`;
    
    return report;
  }

  async generateWeeklyReport(userId) {
    try {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoStr = weekAgo.getFullYear() + '-' +
                        String(weekAgo.getMonth() + 1).padStart(2, '0') + '-' +
                        String(weekAgo.getDate()).padStart(2, '0');
      
      // Get week's habits
      const habits = await this.db.prepare(`
        SELECT h.habit_name, COUNT(he.id) as frequency
        FROM habit_entries he
        JOIN habits h ON he.habit_id = h.id
        WHERE he.user_id = ? AND date(he.logged_at) > ?
        GROUP BY h.habit_name
        ORDER BY frequency DESC
      `).bind(userId, weekAgoStr).all();

      // Get week's tasks
      const tasks = await this.db.prepare(`
        SELECT COUNT(*) as total,
               SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
        FROM tasks
        WHERE user_id = ? AND date(created_at) > ?
      `).bind(userId, weekAgoStr).first();

      return this.formatWeeklyReport({
        habits: habits.results || [],
        tasks: tasks || { total: 0, completed: 0 }
      });
    } catch (error) {
      console.error('Error generating weekly report:', error);
      return "Sorry, I couldn't generate your weekly report right now.";
    }
  }

  formatWeeklyReport(data) {
    const { habits, tasks } = data;
    
    let report = `📈 **Weekly Report**\n\n`;
    
    if (habits.length > 0) {
      report += `🏆 **Top Habits This Week**:\n`;
      habits.slice(0, 5).forEach((habit, index) => {
        const emoji = ['🥇', '🥈', '🥉', '🏅', '⭐'][index] || '•';
        report += `${emoji} ${habit.habit_name}: ${habit.frequency} times\n`;
      });
    }
    
    if (tasks.total > 0) {
      const completionRate = Math.round((tasks.completed / tasks.total) * 100);
      report += `\n✅ **Task Completion**: ${completionRate}% (${tasks.completed}/${tasks.total})\n`;
    }
    
    // Weekly insights
    report += `\n🔍 **Insights**:\n`;
    if (habits.length > 0) {
      const mostFrequent = habits[0];
      report += `• Your strongest habit: ${mostFrequent.habit_name} 💪\n`;
    }
    
    if (tasks.completed > 0) {
      report += `• You completed ${tasks.completed} tasks this week! 🎯\n`;
    }
    
    report += `\n🌟 Keep building those positive habits!`;
    
    return report;
  }
}
