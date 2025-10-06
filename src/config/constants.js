export const Constants = {
  // Bot configuration
  BOT_NAME: 'AI Personal Assistant',
  VERSION: '1.0.0',
  MAX_MESSAGE_LENGTH: 4096,
  MAX_CONTEXT_MESSAGES: 20,
  
  // AI configuration
  DEFAULT_AI_PROVIDER: 'groq',
  FALLBACK_AI_PROVIDER: 'gemini',
  MAX_TOKENS: 1000,
  DEFAULT_TEMPERATURE: 0.7,
  
  // Database limits
  MAX_CONVERSATIONS_PER_USER: 50,
  MAX_HABITS_PER_USER: 20,
  MAX_REMINDERS_PER_USER: 100,
  MAX_FILE_SIZE_MB: 20,
  
  // Time zones - using local/system time
  DEFAULT_TIMEZONE: 'Local',
  
  // Habit tracking
  HABIT_PATTERNS: {
    EXERCISE: ['gym', 'workout', 'exercise', 'run', 'jog', 'fitness', 'training'],
    MEDITATION: ['meditate', 'meditation', 'mindfulness', 'breathing'],
    READING: ['read', 'reading', 'book', 'article', 'study'],
    WATER: ['water', 'hydrate', 'drink', 'fluid'],
    SLEEP: ['sleep', 'slept', 'rest', 'nap', 'bed'],
    CODING: ['code', 'coding', 'programming', 'development', 'github'],
    WRITING: ['write', 'writing', 'journal', 'blog', 'article']
  },
  
  // Response templates
  GREETING_MESSAGES: [
    "Hey! 👋 Ready to make today awesome?",
    "Hello there! 🌟 What's on your agenda?",
    "Hi! 😊 How can I help you stay productive today?",
    "Hey! 💪 Let's tackle your goals together!"
  ],
  
  MOTIVATIONAL_MESSAGES: [
    "You're doing amazing! Keep it up! 🚀",
    "Great progress! I'm proud of you! 🌟",
    "You're building fantastic habits! 💪",
    "Look at you crushing your goals! 🎯",
    "Your consistency is inspiring! 🔥"
  ],
  
  ERROR_MESSAGES: {
    GENERIC: "Oops! Something went wrong. Let's try that again! 🔄",
    AI_UNAVAILABLE: "My AI brain is taking a quick break. Try again in a moment! 🧠",
    DATABASE_ERROR: "I'm having trouble accessing my memory. Please try again! 💭",
    RATE_LIMIT: "Whoa! Let's slow down a bit. Try again in a few seconds! ⏳"
  },
  
  // File types
  SUPPORTED_FILE_TYPES: {
    IMAGE: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    DOCUMENT: ['pdf', 'doc', 'docx', 'txt'],
    AUDIO: ['mp3', 'wav', 'ogg', 'm4a']
  },
  
  // Reminders
  REMINDER_DEFAULTS: {
    DEFAULT_HOUR: 9,
    DEFAULT_MINUTE: 0,
    MAX_REMINDER_DAYS: 365
  },
  
  // Reports
  REPORT_EMOJIS: {
    DAILY: '📊',
    WEEKLY: '📈',
    MONTHLY: '📋',
    HABITS: '💪',
    TASKS: '✅',
    REMINDERS: '⏰'
  },
  
  // API limits
  API_LIMITS: {
    GROQ: {
      REQUESTS_PER_MINUTE: 30,
      TOKENS_PER_MINUTE: 6000
    },
    GEMINI: {
      REQUESTS_PER_MINUTE: 15,
      TOKENS_PER_MINUTE: 1000000
    }
  },
  
  // Cron schedules
  CRON_SCHEDULES: {
    REMINDERS: '*/5 * * * *',      // Every 5 minutes
    DAILY_REPORTS: '0 8 * * *',    // 8 AM daily
    WEEKLY_REPORTS: '0 9 * * 1',   // 9 AM on Mondays
    CLEANUP: '0 2 * * *'           // 2 AM daily cleanup
  }
};
