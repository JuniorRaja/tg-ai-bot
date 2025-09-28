// src/handlers/messageHandler.js
import { AIAdapter } from '../ai/aiAdapter.js';
import { ContextManager } from '../services/contextManager.js';
import { HabitTracker } from '../services/habitTracker.js';
import { ReminderService } from '../services/reminderService.js';
import { getUserFromDB, createUser } from '../storage/d1Database.js';
import { sendTelegramMessage } from '../utils/telegramUtils.js';

export async function messageHandler(message, env) {
  const telegramId = message.from.id.toString();
  const chatId = message.chat.id;
  
  try {
    // Get or create user
    let user = await getUserFromDB(env.DB, telegramId);
    if (!user) {
      user = await createUser(env.DB, {
        telegram_id: telegramId,
        username: message.from.username,
        first_name: message.from.first_name
      });
    }

    // Initialize services
    const aiAdapter = new AIAdapter(env);
    const contextManager = new ContextManager(env.DB, env.KV);
    const habitTracker = new HabitTracker(env.DB);
    const reminderService = new ReminderService(env.DB);

    // Handle different message types
    if (message.text) {
      await handleTextMessage(message, user, aiAdapter, contextManager, habitTracker, reminderService, env);
    } else if (message.photo) {
      await handlePhotoMessage(message, user, aiAdapter, contextManager, env);
    } else if (message.document) {
      await handleDocumentMessage(message, user, aiAdapter, contextManager, env);
    } else if (message.voice) {
      await handleVoiceMessage(message, user, aiAdapter, contextManager, env);
    }

  } catch (error) {
    console.error('Message handler error:', error);
    await sendTelegramMessage(chatId, "Sorry, I encountered an error. Please try again.", env.TELEGRAM_BOT_TOKEN);
  }
}

async function handleTextMessage(message, user, aiAdapter, contextManager, habitTracker, reminderService, env) {
  const text = message.text;
  const chatId = message.chat.id;

  // Handle commands first
  if (text.startsWith('/')) {
    return await handleCommand(message, user, env);
  }

  // Get conversation context
  const context = await contextManager.getContext(user.id);
  
  // Analyze message for intents
  const analysis = await aiAdapter.analyzeMessage(text, context);
  
  // Process specific actions first
  if (analysis.action === 'create_reminder') {
    const reminder = await reminderService.parseAndCreateReminder(text, user.id);
    if (reminder) {
      await sendTelegramMessage(chatId, `✅ Reminder set: "${reminder.message}" at ${new Date(reminder.remind_at).toLocaleString()}`, env.TELEGRAM_BOT_TOKEN);
    }
  }

  if (analysis.action === 'track_habit') {
    await habitTracker.trackFromMessage(text, user.id);
  }

  // Generate AI response
  const aiResponse = await aiAdapter.generateResponse(text, {
    userInfo: {
      name: user.first_name,
      preferences: JSON.parse(user.preferences || '{}')
    },
    recentMessages: context.recentMessages,
    analysis: analysis
  });

  // Save conversation
  await contextManager.saveConversation(user.id, text, aiResponse.content);

  // Send response
  await sendTelegramMessage(chatId, aiResponse.content, env.TELEGRAM_BOT_TOKEN);
}

async function handlePhotoMessage(message, user, aiAdapter, contextManager, env) {
  const chatId = message.chat.id;
  const caption = message.caption || '';
  
  // Store photo info
  const photoInfo = {
    file_id: message.photo[message.photo.length - 1].file_id,
    file_type: 'photo',
    description: caption
  };

  // Generate response about the photo
  const response = await aiAdapter.generateResponse(
    `User shared a photo${caption ? ` with caption: "${caption}"` : ''}. Respond encouragingly and ask relevant questions if appropriate.`,
    { userInfo: { name: user.first_name } }
  );

  await sendTelegramMessage(chatId, response.content, env.TELEGRAM_BOT_TOKEN);
}

async function handleDocumentMessage(message, user, aiAdapter, contextManager, env) {
  const chatId = message.chat.id;
  const fileName = message.document.file_name || 'document';
  
  // Generate response about the document
  const response = await aiAdapter.generateResponse(
    `User shared a document named "${fileName}". Respond encouragingly and offer to help with document-related tasks.`,
    { userInfo: { name: user.first_name } }
  );

  await sendTelegramMessage(chatId, response.content, env.TELEGRAM_BOT_TOKEN);
}

async function handleVoiceMessage(message, user, aiAdapter, contextManager, env) {
  const chatId = message.chat.id;
  const duration = message.voice.duration;
  
  // Generate response about the voice message
  const response = await aiAdapter.generateResponse(
    `User sent a voice message (${duration} seconds). Respond encouragingly and mention that you heard them.`,
    { userInfo: { name: user.first_name } }
  );

  await sendTelegramMessage(chatId, response.content, env.TELEGRAM_BOT_TOKEN);
}

async function handleCommand(message, user, env) {
  const chatId = message.chat.id;
  const command = message.text.split(' ')[0];
  
  const commands = {
    '/start': () => `Hey ${user.first_name}! 👋 I'm your AI personal assistant. I can help you with:\n\n📝 Task management\n⏰ Reminders\n💪 Habit tracking\n📊 Daily reports\n💬 Just chatting!\n\nTry saying something like "remind me to call mom tomorrow at 6pm" or tell me about your day!`,
    
    '/help': () => `Here's what I can do:\n\n🤖 **Chat**: Just talk to me naturally!\n⏰ **Reminders**: "remind me to X at Y time"\n💪 **Habits**: I'll track habits from your messages\n📊 **Reports**: Ask for daily/weekly summaries\n📁 **Files**: Send me photos, docs, voice messages\n\n**Commands:**\n/habits - View your habits\n/reminders - View pending reminders\n/report - Get today's summary\n/settings - Adjust preferences`,
    
    '/habits': async () => {
      const habitTracker = new HabitTracker(env.DB);
      const habits = await habitTracker.getUserHabits(user.id);
      if (habits.length === 0) {
        return "No habits tracked yet! I'll automatically detect and track habits from your daily conversations. Try telling me about your workout, reading, or other activities.";
      }
      return "🏆 **Your Habits:**\n" + habits.map(h => `• ${h.habit_name} (${h.frequency})`).join('\n');
    },
    
    '/reminders': async () => {
      const reminders = await env.DB.prepare(`
        SELECT message, remind_at, status 
        FROM reminders 
        WHERE user_id = ? AND status = 'pending'
        ORDER BY remind_at ASC
        LIMIT 10
      `).bind(user.id).all();
      
      if (reminders.results.length === 0) {
        return "⏰ No pending reminders. Try saying 'remind me to X at Y time'!";
      }
      
      let response = "⏰ **Your Pending Reminders:**\n\n";
      reminders.results.forEach(reminder => {
        const date = new Date(reminder.remind_at).toLocaleString();
        response += `• ${reminder.message}\n  📅 ${date}\n\n`;
      });
      
      return response;
    },
    
    '/report': async () => {
      const { ReportGenerator } = await import('../services/reportGenerator.js');
      const reportGen = new ReportGenerator(env.DB);
      const report = await reportGen.generateDailyReport(user.id);
      return report;
    },

    '/settings': () => {
      const keyboard = {
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
      
      // Send message with keyboard
      sendTelegramMessage(chatId, "⚙️ **Settings Menu:**\n\nChoose an option below:", env.TELEGRAM_BOT_TOKEN, { keyboard });
      return null; // Don't send additional message
    }
  };

  const response = commands[command] || (() => "Unknown command. Type /help to see available commands.");
  
  if (typeof response === 'function') {
    const result = await response();
    if (result) { // Only send message if result is not null
      await sendTelegramMessage(chatId, result, env.TELEGRAM_BOT_TOKEN);
    }
  } else {
    await sendTelegramMessage(chatId, response, env.TELEGRAM_BOT_TOKEN);
  }
}