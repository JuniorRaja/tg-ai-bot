import { messageHandler } from './handlers/messageHandler.js';
import { callbackHandler } from './handlers/callbackHandler.js';
import { ReminderService } from './services/reminderService.js';
import { ScheduledPrompts } from './services/scheduledPrompts.js';

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      
      // Webhook endpoint for Telegram
      if (url.pathname === '/webhook' && request.method === 'POST') {
        const update = await request.json();
        return await handleTelegramUpdate(update, env);
      }
      
      // Cron trigger endpoint (called by Cloudflare Cron)
      if (url.pathname === '/cron' && request.method === 'POST') {
        return await handleCronJob(env);
      }
      
      // Health check
      if (url.pathname === '/health') {
        return new Response('OK', { status: 200 });
      }
      
      return new Response('Not Found', { status: 404 });
    } catch (error) {
      console.error('Worker error:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  },

  // Cron trigger for scheduled tasks
  async scheduled(event, env, ctx) {
    ctx.waitUntil(handleCronJob(env));
  }
};

async function handleTelegramUpdate(update, env) {
  try {
    console.log('[INFO] Incoming Telegram update:', JSON.stringify(update, null, 2));

    if (update.message) {
      console.log(`[INFO] Processing message from user ${update.message.from.id}: "${update.message.text || '[non-text message]'}"`);
      await messageHandler(update.message, env);
    } else if (update.callback_query) {
      console.log(`[INFO] Processing callback query from user ${update.callback_query.from.id}: ${update.callback_query.data}`);
      await callbackHandler(update.callback_query, env);
    }

    console.log('[INFO] Telegram update processed successfully');
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('[ERROR] Telegram update error:', error);
    return new Response('Error', { status: 500 });
  }
}

async function handleCronJob(env) {
  try {
    const currentHour = new Date().getUTCHours();

    // Initialize services
    const reminderService = new ReminderService(env.DB);
    const scheduledPrompts = new ScheduledPrompts(env.DB, env);

    // Process reminder tasks (every 30 minutes, 6 AM - 10 PM)
    await reminderService.processScheduledTasks(env);

    // Process scheduled prompts based on hour
    if (currentHour >= 6 && currentHour <= 11) {
      await scheduledPrompts.processScheduledTask('morning_greeting');
    } else if (currentHour >= 12 && currentHour <= 17) {
      await scheduledPrompts.processScheduledTask('afternoon_greeting');
    } else if (currentHour >= 18 && currentHour <= 21) {
      await scheduledPrompts.processScheduledTask('evening_greeting');
    }

    // Evening reflection at 10 PM
    if (currentHour === 22) {
      await scheduledPrompts.processScheduledTask('evening_reflection');
    }

    return new Response('Cron completed', { status: 200 });
  } catch (error) {
    console.error('Cron job error:', error);
    return new Response('Cron error', { status: 500 });
  }
}
