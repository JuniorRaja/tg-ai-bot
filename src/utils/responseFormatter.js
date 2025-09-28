export class ResponseFormatter {
  static formatResponse(content, options = {}) {
    const { 
      parseMarkdown = true, 
      addEmojis = true, 
      maxLength = 4000,
      tone = 'friendly' 
    } = options;

    let formatted = content;

    // Trim if too long
    if (formatted.length > maxLength) {
      formatted = formatted.substring(0, maxLength - 3) + '...';
    }

    // Add appropriate emojis based on content
    if (addEmojis) {
      formatted = this.addContextualEmojis(formatted);
    }

    // Apply tone adjustments
    formatted = this.adjustTone(formatted, tone);

    return formatted;
  }

  static addContextualEmojis(text) {
    const emojiMap = {
      // Habits and activities
      'workout': '💪',
      'exercise': '🏃‍♂️',
      'gym': '🏋️‍♀️',
      'meditation': '🧘‍♀️',
      'meditated': '🧘‍♂️',
      'reading': '📚',
      'read': '📖',
      'water': '💧',
      'sleep': '😴',
      'code': '💻',
      'coding': '👨‍💻',
      'programming': '🖥️',
      
      // Emotions and reactions
      'great': '🌟',
      'awesome': '🎉',
      'fantastic': '✨',
      'good job': '👏',
      'well done': '🎊',
      'congratulations': '🎉',
      
      // Time and scheduling
      'reminder': '⏰',
      'tomorrow': '📅',
      'today': '📆',
      'schedule': '🗓️',
      
      // Progress and goals
      'goal': '🎯',
      'progress': '📈',
      'achievement': '🏆',
      'streak': '🔥',
      'completed': '✅',
      'done': '✔️'
    };

    let result = text;
    Object.entries(emojiMap).forEach(([keyword, emoji]) => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      if (regex.test(result) && !result.includes(emoji)) {
        result = result.replace(regex, `${keyword} ${emoji}`);
      }
    });

    return result;
  }

  static adjustTone(text, tone) {
    const toneAdjustments = {
      friendly: {
        starters: ['Hey!', 'Hi there!', 'Hello!'],
        endings: ['😊', '👍', '🌟'],
        replacements: {
          'You should': 'You might want to',
          'You must': 'It would be great if you',
          'No': 'Not quite'
        }
      },
      motivational: {
        starters: ['You\'re doing great!', 'Keep it up!', 'Amazing!'],
        endings: ['💪', '🚀', '🔥', '⭐'],
        replacements: {
          'good': 'excellent',
          'nice': 'fantastic',
          'okay': 'doing great'
        }
      },
      professional: {
        starters: ['Certainly.', 'Of course.', 'Understood.'],
        endings: [],
        replacements: {
          'Hey': 'Hello',
          'Yeah': 'Yes',
          'Nope': 'No'
        }
      }
    };

    if (!toneAdjustments[tone]) return text;

    let adjusted = text;
    const adjustment = toneAdjustments[tone];

    // Apply replacements
    Object.entries(adjustment.replacements).forEach(([from, to]) => {
      const regex = new RegExp(`\\b${from}\\b`, 'gi');
      adjusted = adjusted.replace(regex, to);
    });

    return adjusted;
  }

  static formatHabitStreak(habit, streakDays) {
    const streakEmojis = {
      1: '🌱',
      3: '🌿',
      7: '🌳',
      14: '🔥',
      30: '💎',
      100: '👑'
    };

    let emoji = '⭐';
    Object.entries(streakEmojis).forEach(([days, streakEmoji]) => {
      if (streakDays >= parseInt(days)) {
        emoji = streakEmoji;
      }
    });

    return `${emoji} ${habit}: ${streakDays} day streak!`;
  }

  static formatProgressBar(current, total, width = 10) {
    const percentage = Math.min(current / total, 1);
    const filled = Math.floor(percentage * width);
    const empty = width - filled;
    
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    const percent = Math.round(percentage * 100);
    
    return `${bar} ${percent}% (${current}/${total})`;
  }

  static formatTimeAgo(date) {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);

    if (months > 0) return `${months} month${months > 1 ? 's' : ''} ago`;
    if (weeks > 0) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'just now';
  }
}