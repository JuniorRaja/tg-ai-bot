// src/handlers/messageHandler.js
import { AIAdapter } from '../ai/aiAdapter.js';
import { ContextManager } from '../services/contextManager.js';
import { HabitTracker } from '../services/habitTracker.js';
import { ReminderService } from '../services/reminderService.js';
import { TaskService } from '../services/taskService.js';
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
    const taskService = new TaskService(env.DB);

    // Handle different message types
    if (message.text) {
      await handleTextMessage(
        message,
        user,
        aiAdapter,
        contextManager,
        habitTracker,
        reminderService,
        taskService,
        env
      );
    } else if (message.photo) {
      await handlePhotoMessage(message, user, aiAdapter, contextManager, env);
    } else if (message.document) {
      await handleDocumentMessage(message, user, aiAdapter, contextManager, env);
    } else if (message.voice) {
      await handleVoiceMessage(message, user, aiAdapter, contextManager, env);
    }
  } catch (error) {
    console.error('Message handler error:', error);
    await sendTelegramMessage(chatId, 'Sorry, I encountered an error. Please try again.', env.TELEGRAM_BOT_TOKEN);
  }
}

async function handleTextMessage(
  message,
  user,
  aiAdapter,
  contextManager,
  habitTracker,
  reminderService,
  taskService,
  env
) {
  const text = message.text;
  const chatId = message.chat.id;

  // Handle commands first
  if (text.startsWith('/')) {
    return await handleCommand(message, user, env);
  }

  // Get User context
  const context = await contextManager.getContext(user.id);

  // Analyze message for intents
  const analysis = await aiAdapter.analyzeMessage(text, context);

  // Process reminder
  if (analysis.action === 'create_reminder' || analysis.action === 'update_reminder') {
   
    // Reminder Creation
    if (analysis && analysis.action === 'create_reminder') {
      const result = await reminderService.createReminder(text, user.id, aiAdapter);

      if (result) {
        const reminderTime = new Date(result.remindAt).toLocaleString();
        await sendTelegramMessage(
          chatId,
          `✅ Reminder set!\n\n📝 *${result.description}*\n⏰ ${reminderTime}${
            result.notes ? `\n📋 ${result.notes}` : ''
          }`,
          env.TELEGRAM_BOT_TOKEN
        );
      } else {
        await sendTelegramMessage(chatId, '❌ Could not create reminder. Please try again.', env.TELEGRAM_BOT_TOKEN);
      }
    }
    // Reminder Modification
    else {
      const modifyResult = await reminderService.modifyReminder(user.id, text, aiAdapter);
      if (modifyResult && modifyResult.success) {
        await sendTelegramMessage(chatId, modifyResult.message, env.TELEGRAM_BOT_TOKEN);
      } else {
        await sendTelegramMessage(
          chatId,
          "❌ Could not process reminder request. Try: 'Remind me to [task] at [time]' or 'Update [reminder name] to [new time]'",
          env.TELEGRAM_BOT_TOKEN
        );
      }
    }
  }

  if (analysis.action === 'track_habit') {
    await habitTracker.trackFromMessage(text, user.id);
  }

  if (analysis.action === 'create_task') {
    const task = await taskService.parseAndCreateTask(text, user.id);
    if (task) {
      await sendTelegramMessage(chatId, `✅ Task added: "${task.title}"`, env.TELEGRAM_BOT_TOKEN);
    } else {
      console.error(`Failed to create task for user ${user.id}, message: "${text}", analysis:`, analysis);
    }
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
  const fileId = message.photo[message.photo.length - 1].file_id;
  const fileSize = message.photo[message.photo.length - 1].file_size;

  try {
    // Store photo in database
    await env.DB.prepare(
      `
      INSERT INTO files (user_id, file_id, file_type, file_size, description)
      VALUES (?, ?, ?, ?, ?)
    `
    )
      .bind(user.id, fileId, 'photo', fileSize, caption)
      .run();

    console.log(`Photo saved for user ${user.id}: ${fileId}`);
  } catch (error) {
    console.error('Error saving photo:', error);
    await sendTelegramMessage(chatId, "Sorry, I couldn't save your photo. Please try again.", env.TELEGRAM_BOT_TOKEN);
    return;
  }

  // Generate response about the photo
  const response = await aiAdapter.generateResponse(
    `User shared a photo${
      caption ? ` with caption: "${caption}"` : ''
    }. Respond encouragingly and ask relevant questions if appropriate.`,
    { userInfo: { name: user.first_name } }
  );

  await sendTelegramMessage(chatId, response.content, env.TELEGRAM_BOT_TOKEN);
}

async function handleDocumentMessage(message, user, aiAdapter, contextManager, env) {
  const chatId = message.chat.id;
  const fileName = message.document.file_name || 'document';
  const fileId = message.document.file_id;
  const fileSize = message.document.file_size;

  try {
    // Store document in database
    await env.DB.prepare(
      `
      INSERT INTO files (user_id, file_id, file_type, file_size, description)
      VALUES (?, ?, ?, ?, ?)
    `
    )
      .bind(user.id, fileId, 'document', fileSize, fileName)
      .run();

    console.log(`Document saved for user ${user.id}: ${fileId}`);
  } catch (error) {
    console.error('Error saving document:', error);
    await sendTelegramMessage(
      chatId,
      "Sorry, I couldn't save your document. Please try again.",
      env.TELEGRAM_BOT_TOKEN
    );
    return;
  }

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
  const fileId = message.voice.file_id;
  const fileSize = message.voice.file_size;

  try {
    // Store voice message in database
    await env.DB.prepare(
      `
      INSERT INTO files (user_id, file_id, file_type, file_size, description)
      VALUES (?, ?, ?, ?, ?)
    `
    )
      .bind(user.id, fileId, 'voice', fileSize, `Voice message (${duration}s)`)
      .run();

    console.log(`Voice message saved for user ${user.id}: ${fileId}`);
  } catch (error) {
    console.error('Error saving voice message:', error);
    await sendTelegramMessage(
      chatId,
      "Sorry, I couldn't save your voice message. Please try again.",
      env.TELEGRAM_BOT_TOKEN
    );
    return;
  }

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
  const args = message.text.split(' ').slice(1);

  const commands = {
    '/start': () =>
      `Hey ${user.first_name}! 👋 I'm your AI personal assistant. I can help you with:\n\n📝 Task management\n⏰ Reminders\n💪 Habit tracking\n📊 Daily reports\n💬 Just chatting!\n\nTry saying something like "remind me to call mom tomorrow at 6pm" or tell me about your day!`,

    '/help': () =>
      `Here's what I can do:\n\n🤖 **Chat**: Just talk to me naturally!\n⏰ **Reminders**: "remind me to X at Y time"\n� **Tasks**: "add a task to buy milk" or I'll detect them\n�� **Habits**: I'll track habits from your messages\n📊 **Reports**: Ask for daily/weekly summaries\n📁 **Files**: Send me photos, docs, voice messages\n\n**Commands:**\n/tasks - View your tasks\n/habits - View your habits\n/reminders - View pending reminders\n/report - Get today's summary\n/settings - Adjust preferences`,

    '/habits': async () => {
      const habitTracker = new HabitTracker(env.DB);
      const habits = await habitTracker.getUserHabits(user.id);
      if (habits.length === 0) {
        return "No habits tracked yet! I'll automatically detect and track habits from your daily conversations. Try telling me about your workout, reading, or other activities.";
      }
      return '🏆 **Your Habits:**\n' + habits.map((h) => `• ${h.habit_name} (${h.frequency})`).join('\n');
    },

    '/reminders': async () => {
      // Check for filter arguments
      const filter = args[0] || 'pending';

      const reminderService = new ReminderService(env.DB);
      const reminders = await reminderService.getUserReminders(user.id, filter);

      if (reminders.length === 0) {
        const filterText =
          {
            pending: 'pending',
            completed: 'completed',
            cancelled: 'cancelled',
            today: 'for today',
            all: ''
          }[filter] || filter;

        return `⏰ No ${filterText} reminders found. Try saying 'remind me to X at Y time'!`;
      }

      let response = '';
      const statusEmoji = {
        pending: '⏰',
        completed: '✅',
        cancelled: '❌'
      };

      if (filter === 'today') {
        response = "⏰ **Today's Pending Reminders:**\n\n";
      } else if (filter === 'all') {
        response = '⏰ **All Your Reminders:**\n\n';
      } else {
        const statusText = filter.charAt(0).toUpperCase() + filter.slice(1);
        response = `${statusEmoji[filter] || '⏰'} **Your ${statusText} Reminders:**\n\n`;
      }

      reminders.forEach((reminder) => {
        const date = new Date(reminder.remind_at).toLocaleString();
        const title = reminder.description;
        response += `📝 *${title}*\n`;
        response += `   📅 ${date}\n`;
        if (reminder.notes) {
          response += `   📋 ${reminder.notes}\n`;
        }
        response += `   🆔 ID: ${reminder.id}\n\n`;
      });

      // Add usage hints
      response += '*Usage:* `/reminders pending|completed|cancelled|today|all`';

      return response;
    },

    '/report': async () => {
      const { ReportGenerator } = await import('../services/reportGenerator.js');
      const reportGen = new ReportGenerator(env.DB);
      const report = await reportGen.generateDailyReport(user.id);
      return report;
    },

    '/tasks': async () => {
      const taskService = new TaskService(env.DB);
      const tasks = await taskService.getUserTasks(user.id);
      if (tasks.length === 0) {
        return "📝 No tasks yet. Try saying 'add a task to buy milk'! Or allow me to detect tasks from your messages.";
      }
      return (
        '📝 **Your Tasks:**\n' + tasks.map((task, i) => `${i + 1}. ${task.title}\n   ${task.description}`).join('\n\n')
      );
    },

    '/settings': async () => {
      const keyboard = {
        inline_keyboard: [
          [
            { text: '🌍 Timezone', callback_data: 'settings:timezone' },
            { text: '🔔 Notifications', callback_data: 'settings:notifications' }
          ],
          [
            { text: '📊 Reports', callback_data: 'settings:reports' },
            { text: '💪 Habits', callback_data: 'settings:habits' }
          ],
          [
            { text: '🗑️ Clear Data', callback_data: 'settings:clear_data' },
            { text: '❌ Close', callback_data: 'settings:close' }
          ]
        ]
      };

      // Send message with keyboard
      await sendTelegramMessage(chatId, '⚙️ **Settings Menu:**\n\nChoose an option below:', env.TELEGRAM_BOT_TOKEN, {
        keyboard
      });
      return null; // Don't send additional message
    }
  };

  const response = commands[command] || (() => 'Unknown command. Type /help to see available commands.');

  if (typeof response === 'function') {
    const result = await response();
    if (result) {
      // Only send message if result is not null
      await sendTelegramMessage(chatId, result, env.TELEGRAM_BOT_TOKEN);
    }
  } else {
    await sendTelegramMessage(chatId, response, env.TELEGRAM_BOT_TOKEN);
  }
}
