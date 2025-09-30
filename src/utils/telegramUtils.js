// src/utils/telegramUtils.js
export async function sendTelegramMessage(chatId, text, botToken, options = {}) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  
  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: options.parseMode || 'Markdown',
    disable_web_page_preview: options.disablePreview || false,
    disable_notification: options.silent || false
  };
  
  if (options.keyboard) {
    payload.reply_markup = options.keyboard;
  }
  
  if (options.replyToMessageId) {
    payload.reply_to_message_id = options.replyToMessageId;
  }
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error('Telegram API error:', error);
      throw new Error(`Telegram API error: ${error.description}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

export async function editTelegramMessage(chatId, messageId, text, botToken, keyboard = null) {
  const url = `https://api.telegram.org/bot${botToken}/editMessageText`;
  
  const payload = {
    chat_id: chatId,
    message_id: messageId,
    text: text,
    parse_mode: 'Markdown'
  };
  
  if (keyboard) {
    payload.reply_markup = keyboard;
  }
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error('Telegram edit message error:', error);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error editing message:', error);
    throw error;
  }
}

export async function answerCallbackQuery(callbackQueryId, text, botToken, showAlert = true) {
  const url = `https://api.telegram.org/bot${botToken}/answerCallbackQuery`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text || '',
        show_alert: showAlert
      })
    });
    
    return await response.json();
  } catch (error) {
    console.error('Error answering callback query:', error);
    throw error;
  }
}