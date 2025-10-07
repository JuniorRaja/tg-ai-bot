export class ScheduledPrompts {
  constructor(db, env) {
    this.db = db;
    this.env = env;
    this.cronConfig = {
      // Evening reflection at 10 PM
      eveningReflection: {
        name: 'evening_reflection',
        cron: '0 22 * * *', // 10 PM every day
        timezone: 'UTC'
      }
    };
  }

  async processScheduledTask(taskName) {
    try {
      switch (taskName) {
        case 'evening_reflection':
          await this.sendEveningReflectionsToAllUsers();
          break;
        case 'morning_greeting':
          await this.sendGreetingsToAllUsers('morning');
          break;
        case 'afternoon_greeting':
          await this.sendGreetingsToAllUsers('afternoon');
          break;
        case 'evening_greeting':
          await this.sendGreetingsToAllUsers('evening');
          break;
        default:
          console.log(`Unknown scheduled task: ${taskName}`);
      }
    } catch (error) {
      console.error(`Error processing scheduled task ${taskName}:`, error);
    }
  }

  async sendEveningReflectionsToAllUsers() {
    try {
      // Get all users who have been active recently (last 30 days)
      const activeUsers = await this.db.prepare(`
        SELECT id, telegram_id, first_name, timezone
        FROM users
        WHERE last_active > datetime('now', '-30 days')
      `).all();

      const reflectionQuestions = this.getReflectionQuestions();

      for (const user of activeUsers.results || []) {
        await this.sendEveningReflection(user, reflectionQuestions);
      }

      console.log(`Sent evening reflections to ${activeUsers.results?.length || 0} users`);
    } catch (error) {
      console.error('Error sending evening reflections:', error);
    }
  }

  async sendGreetingsToAllUsers(timeOfDay) {
    try {
      // Get all users who have been active recently (last 7 days for greetings)
      const activeUsers = await this.db.prepare(`
        SELECT id, telegram_id, first_name, timezone
        FROM users
        WHERE last_active > datetime('now', '-7 days')
      `).all();

      for (const user of activeUsers.results || []) {
        await this.sendTimedGreeting(user, timeOfDay);
      }

      console.log(`Sent ${timeOfDay} greetings to ${activeUsers.results?.length || 0} users`);
    } catch (error) {
      console.error(`Error sending ${timeOfDay} greetings:`, error);
    }
  }

  getReflectionQuestions() {
    return {
      mood: "How are you feeling right now? (Rate 1-10)",
      highlights: "What's one highlight from your day?",
      challenges: "Did you face any challenges today?",
      tomorrow: "What's one thing you're looking forward to tomorrow?",
      gratitude: "What are you grateful for today?",
      improvements: "Is there anything you could have done differently?"
    };
  }

  async sendEveningReflection(user, questions) {
    try {
      const userTimezone = user.timezone || 'UTC';
      const localTime = this.getCurrentTimeInTimezone(userTimezone);

      if (localTime.hour < 20 || localTime.hour > 23) {
        // Only send evening reflections between 8 PM and 11 PM local time
        return;
      }

      const message = this.formatEveningReflectionMessage(user.first_name);

      await this.sendTelegramMessage(user.telegram_id, message, this.env.TELEGRAM_BOT_TOKEN);

      console.log(`Sent evening reflection to user ${user.id} (${user.first_name})`);
    } catch (error) {
      console.error(`Error sending evening reflection to user ${user.id}:`, error);
    }
  }

  async sendTimedGreeting(user, timeOfDay) {
    try {
      const userTimezone = user.timezone || 'UTC';
      const localTime = this.getCurrentTimeInTimezone(userTimezone);

      // Validate that the current time matches the greeting type
      const hourValidate = {
        morning: localTime.hour >= 6 && localTime.hour < 12,
        afternoon: localTime.hour >= 12 && localTime.hour < 18,
        evening: localTime.hour >= 18 && localTime.hour < 22
      };

      if (hourValidate[timeOfDay]) {
        const message = this.formatTimedGreetingMessage(user.first_name, timeOfDay);
        await this.sendTelegramMessage(user.telegram_id, message, this.env.TELEGRAM_BOT_TOKEN);
        console.log(`Sent ${timeOfDay} greeting to user ${user.id} (${user.first_name}) at ${localTime.hour}:${localTime.minute}`);
      }
    } catch (error) {
      console.error(`Error sending ${timeOfDay} greeting to user ${user.id}:`, error);
    }
  }

  formatTimedGreetingMessage(firstName, timeOfDay) {
    const greetings = {
      morning: [
        `🌅 Good morning, ${firstName}! Rise and shine! How are you starting your day today?`,
        `☀️ Morning, ${firstName}! Ready to conquer the day? What's your plan for today?`,
        `🌞 Top of the morning to you, ${firstName}! How did you sleep?`
      ],
      afternoon: [
        `🌤️ Good afternoon, ${firstName}! Hope your day is going well. How's your energy level?`,
        `☀️ Afternoon, ${firstName}! How has your day been so far?`,
        `🌅 Hi ${firstName}! How's everything going this afternoon?`
      ],
      evening: [
        `🌙 Good evening, ${firstName}! How was your day? Ready to wind down?`,
        `🌆 Evening greetings, ${firstName}! What was the highlight of your day?`,
        `🌠 Hi ${firstName}! How are you feeling as the day comes to a close?`
      ]
    };

    const greetingOptions = greetings[timeOfDay] || [`Hi ${firstName}!`];
    return greetingOptions[Math.floor(Math.random() * greetingOptions.length)];
  }

  formatEveningReflectionMessage(firstName) {
    return `🌙 Good evening, ${firstName}! Time for your daily reflection.

As the day winds down, let's take a moment to reflect on today and set intentions for tomorrow.

**Daily Reflection:**
• How was your mood today? 😊
• What did you accomplish? ✅
• How did you take care of your health? 💚
• What's something you're grateful for? 🙏
• What would you like to focus on tomorrow? 🎯

You can reply to me with your thoughts, or use /daily to get a comprehensive summary of your day!

Remember to get some good sleep tonight. Make tomorrow great! 🌟`;
  }

  getCurrentTimeInTimezone(timezone) {
    // For simplicity, assuming UTC for now. In production, use a proper timezone library
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcMinute = now.getUTCMinutes();

    // Simple timezone offset calculation (should use a proper library)
    const offset = timezone === 'America/New_York' ? -5 :
                  timezone === 'Europe/London' ? 0 :
                  timezone === 'Asia/Tokyo' ? 9 :
                  timezone === 'Australia/Sydney' ? 10 :
                  0; // Default to UTC

    let userHour = utcHour + offset;
    let userMinute = utcMinute;

    if (userHour < 0) userHour += 24;
    if (userHour >= 24) userHour -= 24;

    return {
      hour: userHour,
      minute: userMinute,
      hour24: userHour + (userMinute / 60)
    };
  }

  async generateReflectionPrompts(userId) {
    try {
      const questions = this.getReflectionQuestions();
      let message = "🧘‍♀️ **Evening Reflection Time**\n\n";

      for (const [key, question] of Object.entries(questions)) {
        message += `• ${question}\n`;
      }

      message += "\nUse the inline keyboard below to respond:";

      // Create inline keyboard for responses
      const keyboard = {
        inline_keyboard: [
          [
            { text: 'Mood 😊', callback_data: 'reflection:mood' },
            { text: 'Highlights ⭐', callback_data: 'reflection:highlights' },
            { text: 'Challenges ⚠️', callback_data: 'reflection:challenges' }
          ],
          [
            { text: 'Tomorrow 🎯', callback_data: 'reflection:tomorrow' },
            { text: 'Gratitude 🙏', callback_data: 'reflection:gratitude' },
            { text: 'Improvements 📈', callback_data: 'reflection:improvements' }
          ],
          [
            { text: 'Complete Reflection ✅', callback_data: 'reflection:submit' }
          ]
        ]
      };

      // Store reflection session in KV for tracking responses
      const reflectionKey = `reflection_${userId}_${new Date().toISOString().split('T')[0]}`;
      await this.env.KV.put(reflectionKey, JSON.stringify({
        started: true,
        questions: questions,
        responses: {},
        created_at: new Date().toISOString()
      }), {
        expirationTtl: 24 * 60 * 60 // Expire after 24 hours
      });

      return { message, keyboard };
    } catch (error) {
      console.error('Error generating reflection prompts:', error);
      return null;
    }
  }

  async processReflectionResponse(userId, callbackData) {
    try {
      const date = new Date().toISOString().split('T')[0];
      const reflectionKey = `reflection_${userId}_${date}`;

      const reflectionData = await this.env.KV.get(reflectionKey);
      if (!reflectionData) {
        return { message: "No active reflection session found. Start a new one!", error: true };
      }

      const reflection = JSON.parse(reflectionData);
      const [action, questionType] = callbackData.split(':');

      if (action === 'reflection') {
        if (questionType === 'submit') {
          // Store the reflection in database
          await this.saveReflection(userId, date, reflection);
          await this.env.KV.delete(reflectionKey);

          const responseMessage = this.formatReflectionCompleteMessage(reflection);
          return { message: responseMessage, keyboard: null };
        } else if (questionType === 'start') {
          // Send initial reflection prompt
          const prompts = await this.generateReflectionPrompts(userId);
          return prompts;
        } else {
          // Handle specific question prompts
          const questionMessages = {
            mood: "How are you feeling right now? (Rate 1-10 and tell me why)",
            highlights: "What's one highlight from your day?",
            challenges: "Did you face any challenges today? How did you handle them?",
            tomorrow: "What's one thing you're looking forward to tomorrow?",
            gratitude: "What are you grateful for today?",
            improvements: "Is there anything you could have done differently? Any lessons learned?"
          };

          const question = questionMessages[questionType];
          return {
            message: `✨ *${question}*\n\nReply with your thoughts (I’ll save this for your daily reflection):`,
            keyboard: null
          };
        }
      }
    } catch (error) {
      console.error('Error processing reflection response:', error);
      return { message: "Sorry, I couldn't process your reflection response.", error: true };
    }
  }

  async saveReflection(userId, date, reflectionData) {
    try {
      // Store in user_reflections table
      await this.db.prepare(`
        INSERT OR REPLACE INTO user_reflections (
          user_id, reflection_date, responses, overall_rating, created_at
        ) VALUES (?, ?, ?, ?, datetime('now'))
      `).bind(
        userId,
        date,
        JSON.stringify(reflectionData.responses),
        reflectionData.overallRating || null
      ).run();

      console.log(`Saved reflection for user ${userId} on ${date}`);
    } catch (error) {
      console.error('Error saving reflection:', error);
    }
  }

  formatReflectionCompleteMessage(reflection) {
    let message = "🌟 **Reflection Complete!**\n\nThank you for taking time to reflect today! Your responses have been saved.\n\n";

    if (reflection.responses && Object.keys(reflection.responses).length > 0) {
      message += "**Your Reflections Today:**\n";
      for (const [key, value] of Object.entries(reflection.responses)) {
        message += `• ${key.charAt(0).toUpperCase() + key.slice(1)}: ${value.substring(0, 100)}${value.length > 100 ? '...' : ''}\n`;
      }
    }

    message += "\nUse /daily to see how your reflections align with your daily progress!\n\n";
    message += "💫 Have a peaceful night!";

    return message;
  }

  async sendTelegramMessage(chatId, text, botToken, keyboard = null) {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const body = {
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown',
      ...(keyboard && { reply_markup: keyboard })
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`Telegram API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending Telegram message:', error);
      throw error;
    }
  }
}
