import { sendTelegramMessage, editTelegramMessage, answerCallbackQuery } from '../utils/telegramUtils.js';
import { HabitTracker } from '../services/habitTracker.js';
import { ReminderService } from '../services/reminderService.js';
import { getUserFromDB } from '../storage/d1Database.js';

export async function callbackHandler(callbackQuery, env) {
  const telegramId = callbackQuery.from.id.toString();
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const data = callbackQuery.data;
  
  try {
    // Get user from database
    const user = await getUserFromDB(env.DB, telegramId);
    if (!user) {
      await answerCallbackQuery(callbackQuery.id, "User not found. Please start the bot first.", env.TELEGRAM_BOT_TOKEN);
      return;
    }

    // Parse callback data
    const [action, ...params] = data.split(':');
    
    switch (action) {
      case 'habit_confirm':
        await handleHabitConfirmation(params, user, callbackQuery, env);
        break;
        
      case 'habit_track':
        await handleHabitTracking(params, user, callbackQuery, env);
        break;
        
      case 'reminder_snooze':
        await handleReminderSnooze(params, user, callbackQuery, env);
        break;
        
      case 'reminder_complete':
        await handleReminderComplete(params, user, callbackQuery, env);
        break;
        
      case 'report_type':
        await handleReportRequest(params, user, callbackQuery, env);
        break;
        
      case 'settings':
        await handleSettingsMenu(params, user, callbackQuery, env);
        break;
        
      default:
        await answerCallbackQuery(callbackQuery.id, "Unknown action", env.TELEGRAM_BOT_TOKEN);
    }
  } catch (error) {
    console.error('Callback handler error:', error);
    await answerCallbackQuery(callbackQuery.id, "An error occurred", env.TELEGRAM_BOT_TOKEN);
  }
}

async function handleHabitConfirmation(params, user, callbackQuery, env) {
  const [habitName, action] = params;
  const habitTracker = new HabitTracker(env.DB);
  
  if (action === 'yes') {
    await habitTracker.recordHabit(user.id, habitName);
    
    const keyboard = {
      inline_keyboard: [[
        { text: "View My Habits 📊", callback_data: "report_type:habits" }
      ]]
    };
    
    await editTelegramMessage(
      callbackQuery.message.chat.id,
      callbackQuery.message.message_id,
      `✅ Great! I've recorded your ${habitName} habit for today!`,
      env.TELEGRAM_BOT_TOKEN,
      keyboard
    );
  } else {
    await editTelegramMessage(
      callbackQuery.message.chat.id,
      callbackQuery.message.message_id,
      "No worries! I won't track that as a habit.",
      env.TELEGRAM_BOT_TOKEN
    );
  }
  
  await answerCallbackQuery(callbackQuery.id, null, env.TELEGRAM_BOT_TOKEN);
}

async function handleHabitTracking(params, user, callbackQuery, env) {
  const [habitId, count] = params;
  const habitTracker = new HabitTracker(env.DB);
  
  await habitTracker.recordHabitEntry(habitId, user.id, parseInt(count));
  
  await editTelegramMessage(
    callbackQuery.message.chat.id,
    callbackQuery.message.message_id,
    `✅ Recorded ${count} for your habit today!`,
    env.TELEGRAM_BOT_TOKEN
  );
  
  await answerCallbackQuery(callbackQuery.id, "Habit tracked!", env.TELEGRAM_BOT_TOKEN);
}

async function handleReminderSnooze(params, user, callbackQuery, env) {
  const [reminderId, minutes] = params;
  const reminderService = new ReminderService(env.DB);
  
  const snoozeUntil = new Date();
  snoozeUntil.setMinutes(snoozeUntil.getMinutes() + parseInt(minutes));
  
  await env.DB.prepare(`
    UPDATE reminders 
    SET remind_at = ?, status = 'pending' 
    WHERE id = ? AND user_id = ?
  `).bind(snoozeUntil.toISOString(), reminderId, user.id).run();
  
  await editTelegramMessage(
    callbackQuery.message.chat.id,
    callbackQuery.message.message_id,
    `⏰ Reminder snoozed for ${minutes} minutes`,
    env.TELEGRAM_BOT_TOKEN
  );
  
  await answerCallbackQuery(callbackQuery.id, "Snoozed!", env.TELEGRAM_BOT_TOKEN);
}

async function handleReminderComplete(params, user, callbackQuery, env) {
  const [reminderId] = params;
  
  await env.DB.prepare(`
    UPDATE reminders 
    SET status = 'completed' 
    WHERE id = ? AND user_id = ?
  `).bind(reminderId, user.id).run();
  
  await editTelegramMessage(
    callbackQuery.message.chat.id,
    callbackQuery.message.message_id,
    "✅ Reminder marked as complete!",
    env.TELEGRAM_BOT_TOKEN
  );
  
  await answerCallbackQuery(callbackQuery.id, "Completed!", env.TELEGRAM_BOT_TOKEN);
}

async function handleReportRequest(params, user, callbackQuery, env) {
  const [reportType] = params;
  const { ReportGenerator } = await import('../services/reportGenerator.js');
  const reportGen = new ReportGenerator(env.DB);
  
  let report;
  switch (reportType) {
    case 'daily':
      report = await reportGen.generateDailyReport(user.id);
      break;
    case 'weekly':
      report = await reportGen.generateWeeklyReport(user.id);
      break;
    case 'habits':
      const habitTracker = new HabitTracker(env.DB);
      const habits = await habitTracker.getUserHabits(user.id);
      report = formatHabitsReport(habits);
      break;
    default:
      report = "Report type not recognized.";
  }
  
  await sendTelegramMessage(callbackQuery.message.chat.id, report, env.TELEGRAM_BOT_TOKEN);
  await answerCallbackQuery(callbackQuery.id, null, env.TELEGRAM_BOT_TOKEN);
}

async function handleSettingsMenu(params, user, callbackQuery, env) {
  const [setting, ...additionalParams] = params;
  
  let response = "";
  let keyboard = null;
  
  switch (setting) {
    case 'timezone':
      keyboard = {
        inline_keyboard: [
          [
            { text: "🌍 UTC", callback_data: "settings:set_timezone:UTC" },
            { text: "🇺🇸 EST", callback_data: "settings:set_timezone:EST" }
          ],
          [
            { text: "🇺🇸 PST", callback_data: "settings:set_timezone:PST" },
            { text: "🇪🇺 CET", callback_data: "settings:set_timezone:CET" }
          ]
        ]
      };
      response = "🌍 Select your timezone:";
      break;
      
    case 'set_timezone':
      const timezone = additionalParams[0];
      await env.DB.prepare(`
        UPDATE users 
        SET timezone = ? 
        WHERE id = ?
      `).bind(timezone, user.id).run();
      response = `✅ Timezone set to ${timezone}`;
      break;
      
    case 'notifications':
      keyboard = {
        inline_keyboard: [
          [
            { text: "🔔 Enable All", callback_data: "settings:set_notifications:enable" },
            { text: "🔕 Disable All", callback_data: "settings:set_notifications:disable" }
          ],
          [
            { text: "⏰ Reminders Only", callback_data: "settings:set_notifications:reminders" },
            { text: "📊 Reports Only", callback_data: "settings:set_notifications:reports" }
          ]
        ]
      };
      response = "🔔 Notification preferences:";
      break;
      
    case 'set_notifications':
      const notifType = additionalParams[0];
      const preferences = JSON.parse(user.preferences || '{}');
      
      switch (notifType) {
        case 'enable':
          preferences.notifications = { reminders: true, reports: true, habits: true };
          break;
        case 'disable':
          preferences.notifications = { reminders: false, reports: false, habits: false };
          break;
        case 'reminders':
          preferences.notifications = { reminders: true, reports: false, habits: false };
          break;
        case 'reports':
          preferences.notifications = { reminders: false, reports: true, habits: false };
          break;
      }
      
      await env.DB.prepare(`
        UPDATE users 
        SET preferences = ? 
        WHERE id = ?
      `).bind(JSON.stringify(preferences), user.id).run();
      
      response = `✅ Notification preferences updated`;
      break;

    case 'reports':
      keyboard = {
        inline_keyboard: [
          [
            { text: "📊 Daily Report", callback_data: "report_type:daily" },
            { text: "📈 Weekly Report", callback_data: "report_type:weekly" }
          ],
          [
            { text: "💪 Habits Overview", callback_data: "report_type:habits" }
          ]
        ]
      };
      response = "📊 Choose a report type:";
      break;

    case 'habits':
      keyboard = {
        inline_keyboard: [
          [
            { text: "👀 View Habits", callback_data: "report_type:habits" },
            { text: "➕ Add Habit", callback_data: "settings:add_habit" }
          ],
          [
            { text: "🗑️ Reset Habits", callback_data: "settings:reset_habits" }
          ]
        ]
      };
      response = "💪 Habit Management:";
      break;

    case 'clear_data':
      keyboard = {
        inline_keyboard: [
          [
            { text: "⚠️ Yes, Clear All", callback_data: "settings:confirm_clear" },
            { text: "❌ Cancel", callback_data: "settings:main" }
          ]
        ]
      };
      response = "⚠️ **Warning**: This will delete all your data including conversations, habits, and reminders. This action cannot be undone!";
      break;

    case 'confirm_clear':
      // Clear user data
      await env.DB.prepare(`DELETE FROM conversations WHERE user_id = ?`).bind(user.id).run();
      await env.DB.prepare(`DELETE FROM habits WHERE user_id = ?`).bind(user.id).run();
      await env.DB.prepare(`DELETE FROM habit_entries WHERE user_id = ?`).bind(user.id).run();
      await env.DB.prepare(`DELETE FROM reminders WHERE user_id = ?`).bind(user.id).run();
      await env.DB.prepare(`DELETE FROM tasks WHERE user_id = ?`).bind(user.id).run();
      
      response = "✅ All your data has been cleared. You can start fresh!";
      break;
      
    case 'close':
      await editTelegramMessage(
        callbackQuery.message.chat.id,
        callbackQuery.message.message_id,
        "Settings menu closed.",
        env.TELEGRAM_BOT_TOKEN
      );
      await answerCallbackQuery(callbackQuery.id, null, env.TELEGRAM_BOT_TOKEN);
      return;
      
    default:
      // Main settings menu
      keyboard = {
        inline_keyboard: [
          [
            { text: "🌍 Timezone", callback_data: "settings:timezone" },
            { text: "🔔 Notifications", callback_data: "settings:notifications" }
          ],
          [
            { text: "📊 Reports", callback_data: "settings:reports" },
            { text: "💪 Habits", callback_data: "settings:habits" }
          ],
          [
            { text: "🗑️ Clear Data", callback_data: "settings:clear_data" },
            { text: "❌ Close", callback_data: "settings:close" }
          ]
        ]
      };
      response = "⚙️ Settings Menu:";
  }
  
  await editTelegramMessage(
    callbackQuery.message.chat.id,
    callbackQuery.message.message_id,
    response,
    env.TELEGRAM_BOT_TOKEN,
    keyboard
  );
  
  await answerCallbackQuery(callbackQuery.id, null, env.TELEGRAM_BOT_TOKEN);
}

function formatHabitsReport(habits) {
  if (habits.length === 0) {
    return "💪 **Your Habits**\n\nNo habits tracked yet! Start by telling me about your daily activities.";
  }
  
  let report = "💪 **Your Habits**\n\n";
  
  habits.forEach((habit, index) => {
    const emoji = ['🥇', '🥈', '🥉', '🏅', '⭐'][index] || '•';
    report += `${emoji} **${habit.habit_name}**\n`;
    report += `   └ ${habit.total_entries} times tracked\n`;
    if (habit.last_logged) {
      const lastDate = new Date(habit.last_logged).toLocaleDateString();
      report += `   └ Last: ${lastDate}\n`;
    }
    report += `\n`;
  });
  
  return report;
}