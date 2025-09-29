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
    console.log(`[INFO] Generating AI response using ${provider} (prompt length: ${prompt.length} chars)`);

    try {
      const response = await this.providers[provider].generateResponse(prompt, context, options);
      console.log(`[INFO] AI response generated successfully (content length: ${response.content.length} chars)`);
      return response;
    } catch (error) {
      console.error(`[ERROR] AI provider ${provider} failed:`, error);

      // Try fallback provider
      if (provider !== this.fallbackProvider) {
        console.log(`[WARN] Falling back to ${this.fallbackProvider}`);
        try {
          const fallbackResponse = await this.providers[this.fallbackProvider].generateResponse(prompt, context, options);
          console.log(`[INFO] Fallback AI response generated successfully (content length: ${fallbackResponse.content.length} chars)`);
          return fallbackResponse;
        } catch (fallbackError) {
          console.error(`[ERROR] Fallback AI provider ${this.fallbackProvider} also failed:`, fallbackError);
          throw new Error('All AI providers failed');
        }
      }
      throw error;
    }
  }

  async analyzeMessage(message, context = {}) {
    console.log('[INFO] Preparing AI analysis prompt for message');
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

    console.log(`[INFO] Sending analysis prompt to AI for message: "${message}"`);
    try {
      const response = await this.generateResponse(analysisPrompt, {}, {
        temperature: 0.1,
        maxTokens: 200
      });
      const parsedAnalysis = JSON.parse(response.content);
      console.log(`[INFO] AI analysis result parsed: ${JSON.stringify(parsedAnalysis)}`);
      return parsedAnalysis;
    } catch (error) {
      console.error('[ERROR] AI message analysis failed, using fallback analysis');
      // Fallback to simple analysis
      const fallbackAnalysis = {
        intent: 'casual_chat',
        entities: [],
        sentiment: 'neutral',
        action: 'none'
      };
      console.log(`[INFO] Fallback analysis used: ${JSON.stringify(fallbackAnalysis)}`);
      return fallbackAnalysis;
    }
  }
}
