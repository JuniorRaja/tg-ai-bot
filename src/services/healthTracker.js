export class HealthTracker {
  constructor(db) {
    this.db = db;
    this.detectionPatterns = {
      // Meal patterns
      meals: {
        breakfast: [/breakfast/i, /morning meal/i, /had breakfast/i, /ate breakfast/i],
        lunch: [/lunch/i, /had lunch/i, /ate lunch/i, /noon meal/i],
        dinner: [/dinner/i, /had dinner/i, /ate dinner/i, /evening meal/i, /supper/i],
        snacks: [/snack/i, /snacks/i, /treat/i, /munch/i, /nibble/i]
      },

      // Mood patterns
      mood: {
        positive: [/happy/i, /great/i, /excellent/i, /wonderful/i, /fantastic/i, /amazing/i, /awesome/i],
        negative: [/sad/i, /upset/i, /angry/i, /frustrated/i, /disappointed/i, /terrible/i],
        neutral: [/okay/i, /fine/i, /alright/i, /meh/i, /normal/i],
        anxious: [/anxious/i, /worried/i, /stressed/i, /nervous/i, /overwhelmed/i],
        content: [/calm/i, /peaceful/i, /relaxed/i, /content/i, /satisfied/i]
      },

      // Fitness patterns (enhancing existing habit patterns)
      fitness: [/workout/i, /exercise/i, /jogging/i, /running/i, /gym/i, /cardio/i, /strength training/i, /yoga/i, /skipping/i],

      // Water and hydration
      water: [/drank water/i, /glass of water/i, /bottle of water/i, /hydrated/i, /stayed hydrated/i],

      // Sleep patterns
      sleep: [/slept/i, /bedtime/i, /woke up/i, /morning/i, /hours of sleep/i, /well rested/i, /nap/i]
    };
  }

  async analyzeMessage(message, userId, aiAnalysis = null) {
    const detections = {
      meals: [],
      mood: null,
      fitness: false,
      water: false,
      sleep: null
    };

    // Check for meals
    detections.meals = this.detectMeals(message);
    if (detections.meals.length > 0) {
      await this.logMealsFromMessage(message, userId, detections.meals);
    }

    // Check for mood
    detections.mood = this.detectMood(message);
    if (detections.mood) {
      await this.logMoodEntry(userId, detections.mood);
    }

    // Check for fitness activities
    detections.fitness = this.detectFitness(message);
    if (detections.fitness) {
      // This will be handled by the existing habit tracker, but we can also log to health_logs
      await this.logHealthActivity(userId, 'fitness', detections.fitness);
    }

    // Check for water consumption
    detections.water = this.detectWaterIntake(message);
    if (detections.water) {
      await this.logHealthActivity(userId, 'water', detections.water);
    }

    // Check for sleep mentions
    detections.sleep = this.detectSleep(message);
    if (detections.sleep) {
      await this.logHealthActivity(userId, 'sleep', detections.sleep);
    }

    // If AI analysis provided additional health insights, process them
    if (aiAnalysis?.healthData) {
      await this.processAIAnalysisHealthData(userId, aiAnalysis.healthData);
    }

    return detections;
  }

  detectMeals(message) {
    const detectedMeals = [];
    const lowerMessage = message.toLowerCase();

    for (const [mealType, patterns] of Object.entries(this.detectionPatterns.meals)) {
      for (const pattern of patterns) {
        if (pattern.test(lowerMessage)) {
          // Extract meal description - look for what they ate
          const mealDescription = this.extractMealDescription(message, mealType);
          detectedMeals.push({
            type: mealType,
            description: mealDescription,
            confidence: 1.0
          });
          break; // Only detect one instance per meal type
        }
      }
    }

    return detectedMeals;
  }

  detectMood(message) {
    const lowerMessage = message.toLowerCase();
    let bestMatch = null;
    let highestScore = 0;

    for (const [moodType, patterns] of Object.entries(this.detectionPatterns.mood)) {
      for (const pattern of patterns) {
        if (pattern.test(lowerMessage)) {
          // Calculate a simple score based on position and match quality
          const score = this.calculateMoodScore(message, moodType, pattern);
          if (score > highestScore) {
            highestScore = score;
            bestMatch = {
              type: moodType,
              level: this.moodTypeToLevel(moodType),
              notes: message.substring(0, 200), // Context notes
              confidence: score
            };
          }
        }
      }
    }

    return bestMatch;
  }

  detectFitness(message) {
    const lowerMessage = message.toLowerCase();
    for (const pattern of this.detectionPatterns.fitness) {
      if (pattern.test(lowerMessage)) {
        return {
          activity: this.extractFitnessActivity(message),
          notes: message.substring(0, 150)
        };
      }
    }
    return false;
  }

  detectWaterIntake(message) {
    const lowerMessage = message.toLowerCase();
    for (const pattern of this.detectionPatterns.water) {
      if (pattern.test(lowerMessage)) {
        const intake = this.extractWaterIntake(message);
        return {
          amount: intake.amount,
          unit: intake.unit,
          notes: message.substring(0, 150)
        };
      }
    }
    return false;
  }

  detectSleep(message) {
    const lowerMessage = message.toLowerCase();
    for (const pattern of this.detectionPatterns.sleep) {
      if (pattern.test(lowerMessage)) {
        const sleepData = this.extractSleepData(message);
        return {
          hours: sleepData.hours,
          quality: sleepData.quality,
          notes: message.substring(0, 150)
        };
      }
    }
    return null;
  }

  extractMealDescription(message, mealType) {
    // Simple extraction: find what comes after the meal keyword
    const mealRegexes = {
      breakfast: /breakfast[\s:,]+(.{10,}?)(\.|$|I had|I ate|This morning)/i,
      lunch: /lunch[\s:,]+(.{10,}?)(\.|$|I had|I ate|For lunch)/i,
      dinner: /dinner[\s:,]+(.{10,}?)(\.|$|I had|I ate|For dinner)/i,
      snacks: /snack[\s:,]+(.{10,}?)(\.|$|I had|I ate)/i
    };

    const regex = mealRegexes[mealType];
    if (regex) {
      const match = message.match(regex);
      if (match) {
        return match[1].trim();
      }
    }

    // Fallback: find any food-related words after meal mention
    const foodWords = /\b(pizza|pasta|salad|soup|sandwich|chicken|fish|beef|rice|bread|pasta|fruit|vegetable|cake|cookie|ice cream)\w*/gi;
    const foodMatch = message.match(foodWords);
    if (foodMatch) {
      return foodMatch.slice(0, 3).join(', '); // Limit to 3 items
    }

    return message.substring(0, 100); // Generic description
  }

  calculateMoodScore(message, moodType, pattern) {
    // Simple scoring based on match position and exclusivity
    let score = 0.5;

    // Boost if mood word appears early
    const matchIndex = message.toLowerCase().search(pattern.source);
    if (matchIndex < 50) score += 0.2;

    // Boost for stronger mood indicators
    const strongMoods = ['excellent', 'amazing', 'awesome', 'wonderful', 'fantastic', 'terrible', 'disappointed'];
    if (strongMoods.some(strong => pattern.source.includes(strong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))) {
      score += 0.3;
    }

    return Math.min(score, 1.0);
  }

  moodTypeToLevel(moodType) {
    const moodLevels = {
      positive: 8,
      content: 7,
      neutral: 5,
      anxious: 3,
      negative: 2
    };
    return moodLevels[moodType] || 5;
  }

  extractFitnessActivity(message) {
    // Look for specific activities
    const activities = ['running', 'jogging', 'cycling', 'swimming', 'yoga', 'pilates', 'weights', 'cardio', 'skipping'];
    for (const activity of activities) {
      if (message.toLowerCase().includes(activity)) {
        return activity;
      }
    }

    // Generic workout detection
    if (/workout|exercise|gym/i.test(message)) {
      return 'workout';
    }

    return 'exercise';
  }

  extractWaterIntake(message) {
    // Look for quantities like "2 glasses", "a bottle", etc.
    const quantityMatch = message.match(/(\d+)\s*(glass|glasses|bottle|bottles|cup|cups|liter|liters?|ml|oz)/i);
    if (quantityMatch) {
      return {
        amount: parseInt(quantityMatch[1]),
        unit: quantityMatch[2].toLowerCase()
      };
    }

    // Default to 1 glass if water intake mentioned
    return { amount: 1, unit: 'glass' };
  }

  extractSleepData(message) {
    // Look for hours slept
    const hoursMatch = message.match(/(\d+(?:\.\d+)?)\s*hours?\s*(?:of\s*)?sleep/i);
    if (hoursMatch) {
      const hours = parseFloat(hoursMatch[1]);
      const quality = hours >= 7 ? 'good' : hours >= 5 ? 'fair' : 'poor';
      return { hours, quality };
    }

    // Qualitative sleep mentions
    const qualityIndications = {
      'well rested': 'good',
      'tired': 'poor',
      'exhausted': 'poor',
      'refreshed': 'good'
    };

    for (const [indicator, quality] of Object.entries(qualityIndications)) {
      if (message.toLowerCase().includes(indicator)) {
        return { hours: null, quality };
      }
    }

    return { hours: null, quality: 'unknown' };
  }

  async logMealsFromMessage(message, userId, meals) {
    for (const meal of meals) {
      try {
        await this.db.prepare(`
          INSERT INTO meals (user_id, meal_type, description, logged_at)
          VALUES (?, ?, ?, datetime('now'))
        `).bind(userId, meal.type, meal.description).run();
      } catch (error) {
        console.error('Error logging meal:', error);
      }
    }
  }

  async logMoodEntry(userId, moodData) {
    try {
      await this.db.prepare(`
        INSERT INTO mood_entries (user_id, mood_level, mood_type, notes, logged_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `).bind(userId, moodData.level, moodData.type, moodData.notes).run();
    } catch (error) {
      console.error('Error logging mood:', error);
    }
  }

  async logHealthActivity(userId, activityType, data) {
    try {
      const value = JSON.stringify(data);
      await this.db.prepare(`
        INSERT INTO health_logs (user_id, log_type, value, notes, logged_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `).bind(userId, activityType, value, data.notes || null).run();
    } catch (error) {
      console.error('Error logging health activity:', error);
    }
  }

  async processAIAnalysisHealthData(userId, healthData) {
    // Process additional health insights from AI analysis
    try {
      if (healthData.calories) {
        await this.logHealthActivity(userId, 'calories', { amount: healthData.calories });
      }

      if (healthData.energyLevel) {
        await this.logHealthActivity(userId, 'energy', {
          level: healthData.energyLevel,
          notes: healthData.energyNotes
        });
      }

      // Add more AI-driven health logging as needed
    } catch (error) {
      console.error('Error processing AI health data:', error);
    }
  }

  async getDailyHealthSummary(userId, date = null) {
    const targetDate = date || new Date().toISOString().split('T')[0];

    try {
      // Get meals
      const meals = await this.db.prepare(`
        SELECT meal_type, description, logged_at
        FROM meals
        WHERE user_id = ? AND date(logged_at) = ?
        ORDER BY logged_at ASC
      `).bind(userId, targetDate).all();

      // Get mood entries
      const moodEntries = await this.db.prepare(`
        SELECT mood_level, mood_type, notes, logged_at
        FROM mood_entries
        WHERE user_id = ? AND date(logged_at) = ?
        ORDER BY logged_at DESC
      `).bind(userId, targetDate).all();

      // Get health activities
      const healthActivities = await this.db.prepare(`
        SELECT log_type, value, notes, logged_at
        FROM health_logs
        WHERE user_id = ? AND date(logged_at) = ?
        ORDER BY logged_at ASC
      `).bind(userId, targetDate).all();

      return {
        date: targetDate,
        meals: meals.results || [],
        mood: moodEntries.results || [],
        activities: healthActivities.results || []
      };
    } catch (error) {
      console.error('Error getting daily health summary:', error);
      return {
        date: targetDate,
        meals: [],
        mood: [],
        activities: []
      };
    }
  }
}
