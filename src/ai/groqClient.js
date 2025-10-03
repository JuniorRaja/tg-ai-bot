export class GroqClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.groq.com/openai/v1';
    this.model = 'llama-3.3-70b-versatile'; // or 'mixtral-8x7b-32768'
  }

  async generateResponse(prompt, context = {}, options = {}) {
    const messages = this.buildMessages(prompt, context);

    const mood = this.detectMood(context.recentMessages);

    // Temperature: more creative for excited, measured for anxious/down
    const temperature =
      mood === 'excited' ? 0.9 : mood === 'anxious' || mood === 'down' ? 0.5 : mood === 'frustrated' ? 0.6 : 0.7;

    // Dynamic token limit based on context
    const messageLength = prompt.length;
    const complexityIndicators = /how|why|what|explain|tell me about|details/i.test(prompt);

    let maxTokens = 100; // Base: very short (1-2 sentences)

    if (complexityIndicators || messageLength > 100) {
      maxTokens = 200; // Medium: 2-4 sentences for questions/complex topics
    }
    if (mood === 'down' || mood === 'anxious') {
      maxTokens = 180; // Supportive responses need slightly more space
    }
    if (mood === 'excited' || mood === 'happy') {
      maxTokens = 120; // Keep energy high with punchy responses
    }
    if (mood === 'tired') {
      maxTokens = 80; // Ultra brief for tired users
    }

    const requestBody = {
      model: options.model || this.model,
      messages,
      temperature: options.temperature || temperature,
      max_tokens: options.maxTokens || maxTokens,
      stream: false
    };

    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      content: data.choices[0].message.content,
      model: data.model,
      usage: data.usage
    };
  }

  buildMessages(prompt, context) {
    const messages = [];

    // Extract key context info
    const recentMood = this.detectMood(context.recentMessages);
    const timeOfDay = new Date().getHours();

    // Dynamic personality traits based on context
    const personalityMix = this.selectPersonality(recentMood, timeOfDay);

    // System message with personality
    messages.push({
      role: 'system',
      content: `You are Prasanna's helpful AI personal assistant with these traits:
      - Friendly, witty, and motivating
      - Remember user's goals and habits
      - Provide practical advice and encouragement
      - Keep responses concise but warm
      - Adapt your tone to the user's mood
      - Help with productivity, habits, and personal growth

      Context about the user: ${JSON.stringify(context.userInfo || {})}
      Recent conversation: ${JSON.stringify(context.recentMessages || [])}
      Recent vibe: ${recentMood}
      Personality Mix: ${personalityMix}`
    });

    // Add the current prompt
    messages.push({
      role: 'user',
      content: prompt
    });

    return messages;
  }

  // Helper: Detect mood from recent messages with better context
  detectMood(recentMessages = []) {
    if (!recentMessages.length) return 'neutral';

    const lastFew = recentMessages.slice(-3).join(' ').toLowerCase();

    // Emoji-based mood detection (primary indicator)
    const happyEmojis = /😊|😄|😁|🎉|❤️|👍|✨|🔥|😍|🥳|🙌|💪/;
    const sadEmojis = /😢|😭|😔|😞|💔|😩|😟|🥺|😓/;
    const excitedEmojis = /🤩|😎|🚀|⚡|🎯|💯|🔥|🙌|✊/;
    const tiredEmojis = /😴|🥱|😫|💤|😵|🫠|😮‍💨/;
    const frustratedEmojis = /😤|😠|😡|🤬|😒|🙄|😑/;
    const anxiousEmojis = /😰|😨|😱|😬|🫨|😖/;

    // Score-based detection (emoji priority)
    let scores = { happy: 0, down: 0, excited: 0, tired: 0, frustrated: 0, anxious: 0 };

    // Emojis count more (weight: 3)
    if (happyEmojis.test(lastFew)) scores.happy += 3;
    if (sadEmojis.test(lastFew)) scores.down += 3;
    if (excitedEmojis.test(lastFew)) scores.excited += 3;
    if (tiredEmojis.test(lastFew)) scores.tired += 3;
    if (frustratedEmojis.test(lastFew)) scores.frustrated += 3;
    if (anxiousEmojis.test(lastFew)) scores.anxious += 3;

    // Context-aware keyword detection (weight: 1-2)
    const patterns = {
      happy: [
        { regex: /\b(crushed|nailed|killed)\s+(it|that|my)\b/, weight: 2 },
        { regex: /\b(finally|yes|yay|woohoo|awesome)\b/i, weight: 2 },
        { regex: /\b(feeling\s+good|doing\s+great|went\s+well)\b/, weight: 2 },
        { regex: /\b(proud|accomplished|achieved|completed)\b/, weight: 1 }
      ],
      excited: [
        { regex: /\b(let's\s+go|let's\s+do\s+this|pumped|hyped|ready)\b/i, weight: 2 },
        { regex: /\b(can't\s+wait|so\s+excited|omg|wow)\b/i, weight: 2 },
        { regex: /!{2,}/, weight: 1 } // Multiple exclamation marks
      ],
      down: [
        { regex: /\b(feel(ing)?\s+(bad|down|low|awful|terrible|miserable))\b/, weight: 2 },
        { regex: /\b(failed|messed\s+up|screwed\s+up|disaster)\b/, weight: 2 },
        { regex: /\b(depressed|hopeless|worthless|useless)\b/, weight: 2 },
        { regex: /\b(why\s+bother|what's\s+the\s+point|give\s+up)\b/, weight: 1 }
      ],
      tired: [
        { regex: /\b(exhausted|drained|burnt\s+out|wiped\s+out)\b/, weight: 2 },
        { regex: /\b(can'?t\s+(do\s+this|anymore|even))\b/, weight: 2 },
        { regex: /\b(so\s+tired|dead\s+tired|need\s+sleep|need\s+(a\s+)?break)\b/, weight: 2 }
      ],
      frustrated: [
        { regex: /\b(annoying|irritating|frustrating|pissed\s+off)\b/, weight: 2 },
        { regex: /\b(ugh|argh|ffs|wtf|seriously)\b/i, weight: 2 },
        { regex: /\b(stuck|blocked|not\s+working|broken)\b/, weight: 1 }
      ],
      anxious: [
        { regex: /\b(worried|anxious|nervous|scared|freaking\s+out)\b/, weight: 2 },
        { regex: /\b(stressed|overwhelmed|panicking)\b/, weight: 2 },
        { regex: /\b(what\s+if|don't\s+know\s+what|uncertain)\b/, weight: 1 }
      ]
    };

    // Calculate scores from patterns
    for (const [mood, moodPatterns] of Object.entries(patterns)) {
      for (const { regex, weight } of moodPatterns) {
        if (regex.test(lastFew)) {
          scores[mood] += weight;
        }
      }
    }

    // Get highest scoring mood
    const maxScore = Math.max(...Object.values(scores));
    if (maxScore === 0) return 'neutral';

    const detectedMood = Object.entries(scores)
      .filter(([_, score]) => score === maxScore)
      .map(([mood]) => mood)[0];

    return detectedMood || 'neutral';
  }

  // Helper: Select personality based on context
  selectPersonality(mood, hour) {
    const personalities = {
      happy: 'Be playful and energetic.',
      down: 'Be supportive but keep it real - no toxic positivity.',
      excited: 'Match their hype! Use exclamation marks and energy.',
      tired: 'Be chill and understanding. Short responses.',
      frustrated: "Be patient and helpful. Don't dismiss their frustration.",
      anxious: 'Be calm and reassuring. Keep it grounded.',
      neutral: 'Be balanced - friendly but not over the top.'
    };

    // Enhanced time-based variations
    let timeContext = '';
    if (hour >= 5 && hour < 12) {
      timeContext = 'Morning energy ☀️';
    } else if (hour >= 12 && hour < 17) {
      timeContext = 'Midday flow 🌤️';
    } else if (hour >= 17 && hour < 21) {
      timeContext = 'Evening chill 🌆';
    } else if (hour >= 21 && hour < 24) {
      timeContext = 'Night vibes 🌙';
    } else {
      timeContext = 'Late night hustle 🌃';
    }

    return `${personalities[mood] || personalities.neutral} ${timeContext}`;
  }
}
