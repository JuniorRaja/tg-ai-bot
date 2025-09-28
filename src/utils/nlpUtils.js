export class NLPUtils {
  static extractEntities(text) {
    const entities = {
      times: [],
      dates: [],
      habits: [],
      emotions: [],
      tasks: [],
      numbers: []
    };

    // Time extraction
    const timePatterns = [
      /\b(\d{1,2}):(\d{2})\s*(am|pm)?\b/gi,
      /\b(morning|afternoon|evening|night)\b/gi,
      /\b(tomorrow|today|yesterday)\b/gi
    ];

    timePatterns.forEach(pattern => {
      const matches = [...text.matchAll(pattern)];
      entities.times.push(...matches.map(m => m[0]));
    });

    // Habit keywords
    const habitKeywords = [
      'exercise', 'workout', 'gym', 'run', 'jog', 'walk',
      'meditate', 'meditation', 'mindfulness',
      'read', 'reading', 'book',
      'water', 'hydrate', 'drink',
      'sleep', 'rest', 'nap',
      'code', 'programming', 'develop',
      'write', 'journal', 'blog'
    ];

    habitKeywords.forEach(keyword => {
      if (text.toLowerCase().includes(keyword)) {
        entities.habits.push(keyword);
      }
    });

    // Emotion extraction
    const emotionKeywords = {
      positive: ['happy', 'excited', 'great', 'awesome', 'good', 'fantastic', 'amazing'],
      negative: ['sad', 'tired', 'stressed', 'anxious', 'bad', 'awful', 'terrible'],
      neutral: ['okay', 'fine', 'alright', 'normal']
    };

    Object.entries(emotionKeywords).forEach(([emotion, keywords]) => {
      keywords.forEach(keyword => {
        if (text.toLowerCase().includes(keyword)) {
          entities.emotions.push(emotion);
        }
      });
    });

    // Task indicators
    const taskPatterns = [
      /need to (.+)/gi,
      /have to (.+)/gi,
      /should (.+)/gi,
      /must (.+)/gi,
      /going to (.+)/gi
    ];

    taskPatterns.forEach(pattern => {
      const matches = [...text.matchAll(pattern)];
      entities.tasks.push(...matches.map(m => m[1].trim()));
    });

    // Numbers
    const numberPattern = /\b\d+\b/g;
    const numbers = text.match(numberPattern);
    if (numbers) {
      entities.numbers = numbers.map(n => parseInt(n));
    }

    return entities;
  }

  static analyzeSentiment(text) {
    const positiveWords = [
      'good', 'great', 'awesome', 'amazing', 'fantastic', 'excellent', 'wonderful',
      'happy', 'excited', 'love', 'like', 'enjoy', 'perfect', 'beautiful',
      'success', 'achieve', 'accomplished', 'proud', 'grateful', 'blessed'
    ];

    const negativeWords = [
      'bad', 'terrible', 'awful', 'horrible', 'hate', 'dislike', 'sad',
      'angry', 'frustrated', 'stressed', 'anxious', 'worried', 'tired',
      'failed', 'fail', 'problem', 'issue', 'difficult', 'hard', 'struggle'
    ];

    const words = text.toLowerCase().split(/\s+/);
    let positiveCount = 0;
    let negativeCount = 0;

    words.forEach(word => {
      if (positiveWords.includes(word)) positiveCount++;
      if (negativeWords.includes(word)) negativeCount++;
    });

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  static extractKeywords(text, minLength = 3) {
    // Common stop words to ignore
    const stopWords = [
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have',
      'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
      'may', 'might', 'can', 'this', 'that', 'these', 'those', 'i', 'you',
      'he', 'she', 'it', 'we', 'they', 'my', 'your', 'his', 'her', 'its',
      'our', 'their', 'me', 'him', 'her', 'us', 'them'
    ];

    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => 
        word.length >= minLength && 
        !stopWords.includes(word) &&
        !/^\d+$/.test(word)
      );

    // Count frequency
    const frequency = {};
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });

    // Return sorted by frequency
    return Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)
      .map(([word, count]) => ({ word, count }));
  }

  static detectIntent(text) {
    const intents = [
      {
        name: 'reminder',
        patterns: [/remind me/i, /don't forget/i, /remember to/i],
        confidence: 0
      },
      {
        name: 'habit_report',
        patterns: [/went to gym/i, /worked out/i, /meditated/i, /read/i, /drank water/i],
        confidence: 0
      },
      {
        name: 'question',
        patterns: [/\?$/, /^(what|how|when|where|why|who)/i],
        confidence: 0
      },
      {
        name: 'task',
        patterns: [/need to/i, /have to/i, /should/i, /must/i],
        confidence: 0
      },
      {
        name: 'greeting',
        patterns: [/^(hi|hello|hey|good morning|good afternoon|good evening)/i],
        confidence: 0
      },
      {
        name: 'report_request',
        patterns: [/report/i, /summary/i, /progress/i, /how.*doing/i],
        confidence: 0
      }
    ];

    // Calculate confidence for each intent
    intents.forEach(intent => {
      intent.patterns.forEach(pattern => {
        if (pattern.test(text)) {
          intent.confidence += 1;
        }
      });
    });

    // Return intent with highest confidence
    const topIntent = intents.reduce((prev, current) => 
      prev.confidence > current.confidence ? prev : current
    );

    return topIntent.confidence > 0 ? topIntent.name : 'general_chat';
  }
}