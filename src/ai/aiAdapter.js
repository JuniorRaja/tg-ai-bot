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
      return await this.providers[provider].generateResponse(prompt, context, options);
    } catch (error) {
      console.error(`${provider} failed:`, error);
      
      // Try fallback provider
      if (provider !== this.fallbackProvider) {
        console.log(`Falling back to ${this.fallbackProvider}`);
        try {
          return await this.providers[this.fallbackProvider].generateResponse(prompt, context, options);
        } catch (fallbackError) {
          console.error(`${this.fallbackProvider} also failed:`, fallbackError);
          throw new Error('All AI providers failed');
        }
      }
      throw error;
    }
  }

  async analyzeMessage(message, context = {}) {
    const analysisPrompt = `
Analyze this message for:
1. Intent (question, task, reminder, habit report, casual chat)
2. Entities (dates, times, habit names, task names)
3. Sentiment (positive, neutral, negative)
4. Action required (none, create_reminder, track_habit, create_task)

Message: "${message}"
Context: ${JSON.stringify(context)}

Respond with JSON only:
`;

    try {
      const response = await this.generateResponse(analysisPrompt, {}, { 
        temperature: 0.1,
        maxTokens: 200 
      });
      return JSON.parse(response.content);
    } catch (error) {
      // Fallback to simple analysis
      return {
        intent: 'casual_chat',
        entities: [],
        sentiment: 'neutral',
        action: 'none'
      };
    }
  }
}