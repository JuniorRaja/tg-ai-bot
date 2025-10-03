// src/ai/aiAdapter.js
import { GroqClient } from './groqClient.js';
import { GeminiClient } from './geminiClient.js';

export class AIAdapter {
  constructor(env) {
    this.providers = {
      groq: new GroqClient(env.GROQ_API_KEY),
      gemini: new GeminiClient(env.GEMINI_API_KEY)
    };
    this.defaultProvider = 'groq';
    this.fallbackProvider = 'gemini';
  }

  async generateResponse(prompt, context = {}, options = {}) {
    const provider = options.provider || this.defaultProvider;

    try {
      const response = await this.providers[provider].generateResponse(prompt, context, options);
      return response;
    } catch (error) {
      console.error(`AI generation with ${provider} failed:`, error);

      // Try fallback provider
      if (provider !== this.fallbackProvider) {
        try {
          const response = await this.providers[this.fallbackProvider].generateResponse(prompt, context, options);
          return response;
        } catch (fallbackError) {
          console.error(`Fallback AI generation with ${this.fallbackProvider} also failed:`, fallbackError);
          throw new Error('All AI providers failed');
        }
      }
      throw error;
    }
  }

  async analyzeMessage(message, context = {}) {
    // Build enhanced context-aware prompt
    const analysisPrompt = this.buildAnalysisPrompt(message, context);

    try {
      const response = await this.generateResponse(
        analysisPrompt,
        {},
        {
          temperature: 0.1,
          maxTokens: 300
        }
      );

      // Try to extract JSON from response
      let jsonContent = response.content.trim();

      // Remove markdown code blocks if present
      jsonContent = jsonContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');

      // Find JSON object in the response
      const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonContent = jsonMatch[0];
      }

      const parsed = JSON.parse(jsonContent);
      console.log(`[INFO] Successfully parsed AI analysis:`, parsed);
      return parsed;
    } catch (error) {
      console.error(`[ERROR] AI message analysis failed, using fallback analysis`, error);

      // Fallback to simple rule-based analysis
      const fallbackAnalysis = this.simpleFallbackAnalysis(message);
      console.log(`[INFO] Fallback analysis used:`, fallbackAnalysis);
      return fallbackAnalysis;
    }
  }

  // Enhanced prompt builder with context and examples
  buildAnalysisPrompt(message, context) {
    const currentTime = new Date();
    const hour = currentTime.getHours();
    const dayOfWeek = currentTime.toLocaleDateString('en-US', {
      weekday: 'long'
    });

    // Build context summary
    const recentContext = this.summarizeRecentContext(context);

    return `You are an intent analyzer. Extract actionable information from the user's message.

    CURRENT CONTEXT:
    - Time: ${hour}:${currentTime.getMinutes().toString().padStart(2, '0')} (${hour < 12 ? 'AM' : 'PM'})
    - Day: ${dayOfWeek}
    - Recent Conversation Summary: ${recentContext}

    USER MESSAGE: "${message}"

    ANALYZE AND RESPOND WITH ONLY THIS JSON (no markdown, no commentary):
    Return JSON with this exact structure:
    {
      "intent": "reminder|habit_report|question|task|greeting|report_request|general_chat",
      "entities": {
        "times": ["<time_mentions>"],
          "dates": ["<date_mentions>"],
          "habits": ["<habit_types>"],
          "tasks": ["<task_items>"]
      },
      "sentiment": "positive|neutral|negative",
      "action": "create_reminder|track_habit|create_task|none"
    }

    Rules:
    - If message contains like "remind me", set action to "create_reminder"
    - If message mentions exercise/gym/meditation/reading, set action to "track_habit"
    - If message contains "need to"/"have to", set action to "create_task"
    - Extract any time/date mentions in entities.times and entities.dates
    - Return ONLY the JSON object, nothing else`;
  }

  // Summarize recent context for better analysis
  summarizeRecentContext(context) {
    if (!context.recentMessages || context.recentMessages.length === 0) {
      return ' No recent context';
    }

    const messages = context.recentMessages.slice(-3);
    const hasPendingTasks = context.pendingTasks?.length > 0;
    const hasActiveHabits = context.activeHabits?.length > 0;

    let summary = [];

    if (messages.length > 0) {
      summary.push(`- Recent topic: ${this.extractTopic(messages)}`);
    }

    // TODO: These keys should be present in the context for better context understanding
    // if (hasPendingTasks) {
    //   summary.push(`- User has ${context.pendingTasks.length} pending task(s)`);
    // }

    // if (hasActiveHabits) {
    //   summary.push(`- Tracking habits: ${context.activeHabits.join(', ')}`);
    // }

    return summary.length > 0 ? summary.join('\n') : ' No recent context';
  }

  // Extract general topic from recent messages
  extractTopic(messages) {
    const combined = messages
      .map((m) => m.message || m)
      .join(' ')
      .toLowerCase();

    // Topic detection patterns
    const topics = {
      'work/productivity': /work|project|meeting|deadline|task|productivity/,
      'health/fitness': /gym|workout|exercise|health|fitness|meditation|yoga/,
      habits: /habit|routine|tracking|streak|daily/,
      planning: /plan|schedule|reminder|calendar|tomorrow/,
      emotions: /feel|feeling|mood|tired|happy|sad|stressed/,
      learning: /learn|study|read|course|book|practice/
    };

    for (const [topic, pattern] of Object.entries(topics)) {
      if (pattern.test(combined)) {
        return topic;
      }
    }

    return 'general conversation';
  }

  simpleFallbackAnalysis(message) {
    const lowerMessage = message.toLowerCase();

    // Detect intent and action
    let intent = 'general_chat';
    let action = 'none';

    if (lowerMessage.includes('remind me') || lowerMessage.includes('reminder')) {
      intent = 'reminder';
      action = 'create_reminder';
    } else if (
      lowerMessage.includes('gym') ||
      lowerMessage.includes('workout') ||
      lowerMessage.includes('exercise') ||
      lowerMessage.includes('meditate') ||
      lowerMessage.includes('read')
    ) {
      intent = 'habit_report';
      action = 'track_habit';
    } else if (
      lowerMessage.includes('need to') ||
      lowerMessage.includes('have to') ||
      lowerMessage.includes('must') ||
      lowerMessage.includes('should') ||
      lowerMessage.includes('todo') ||
      (lowerMessage.includes('add') && lowerMessage.includes('task'))
    ) {
      intent = 'task';
      action = 'create_task';
    } else if (lowerMessage.includes('?')) {
      intent = 'question';
    } else if (lowerMessage.match(/^(hi|hello|hey|good morning|good afternoon)/)) {
      intent = 'greeting';
    } else if (
      lowerMessage.includes('report') ||
      lowerMessage.includes('summary') ||
      lowerMessage.includes('progress')
    ) {
      intent = 'report_request';
    }

    // Extract entities
    const entities = {
      times: this.extractTimes(message),
      dates: this.extractDates(message),
      habits: this.extractHabits(message),
      tasks: []
    };

    // Detect sentiment
    const sentiment = this.detectSentiment(message);

    return {
      intent,
      entities,
      sentiment,
      action
    };
  }

  extractTimes(message) {
    const times = [];
    const timePatterns = [
      /\b(\d{1,2}):(\d{2})\s*(am|pm)?\b/gi,
      /\b(\d{1,2})\s*(am|pm)\b/gi,
      /\b(morning|afternoon|evening|night)\b/gi
    ];

    timePatterns.forEach((pattern) => {
      const matches = [...message.matchAll(pattern)];
      times.push(...matches.map((m) => m[0]));
    });

    return times;
  }

  extractDates(message) {
    const dates = [];
    const datePatterns = [
      /\b(tomorrow|today|yesterday)\b/gi,
      /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
      /\bnext\s+(week|month|year)\b/gi
    ];

    datePatterns.forEach((pattern) => {
      const matches = [...message.matchAll(pattern)];
      dates.push(...matches.map((m) => m[0]));
    });

    return dates;
  }

  extractHabits(message) {
    const habits = [];
    const habitKeywords = {
      exercise: ['gym', 'workout', 'exercise', 'fitness', 'run', 'jog', 'skipping'],
      meditation: ['meditate', 'meditation', 'mindfulness'],
      reading: ['read', 'reading', 'book'],
      water: ['water', 'hydrate'],
      sleep: ['sleep', 'slept', 'nap'],
      coding: ['code', 'coding', 'programming'],
      writing: ['write', 'writing', 'journal']
    };

    const lowerMessage = message.toLowerCase();

    Object.entries(habitKeywords).forEach(([habit, keywords]) => {
      if (keywords.some((keyword) => lowerMessage.includes(keyword))) {
        habits.push(habit);
      }
    });

    return [...new Set(habits)]; // Remove duplicates
  }

  detectSentiment(message) {
    const positiveWords = ['good', 'great', 'awesome', 'happy', 'excited', 'love', 'perfect'];
    const negativeWords = ['bad', 'terrible', 'sad', 'angry', 'hate', 'awful', 'stressed'];

    const lowerMessage = message.toLowerCase();

    const positiveCount = positiveWords.filter((word) => lowerMessage.includes(word)).length;
    const negativeCount = negativeWords.filter((word) => lowerMessage.includes(word)).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }
}
