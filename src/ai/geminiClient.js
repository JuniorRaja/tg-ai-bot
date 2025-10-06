export class GeminiClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://generativelanguage.googleapis.com/v1';
    this.model = 'gemini-2.5-flash'; // or 'gemini-2.5-pro'
  }

  async generateResponse(prompt, context = {}, options = {}) {
    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: this.buildPrompt(prompt, context)
            }
          ]
        }
      ],
      generationConfig: {
        temperature: options.temperature || 0.7,
        maxOutputTokens: options.maxTokens || 1000,
        topP: 0.95,
        topK: 64
      }
    };

    const response = await fetch(`${this.baseURL}/models/${this.model}:generateContent?key=${this.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No response generated from Gemini');
    }

    return {
      content: data.candidates[0].content.parts[0].text,
      model: this.model,
      usage: data.usageMetadata
    };
  }

  // Raw response method that bypasses the conversational system prompt
  async generateRawResponse(messages, options = {}) {
    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: messages[1]?.content || messages[0]?.content || ''
            }
          ]
        }
      ],
      generationConfig: {
        temperature: options.temperature || 0.1,
        maxOutputTokens: options.maxTokens || 300,
        topP: 0.95,
        topK: 64
      }
    };

    const response = await fetch(`${this.baseURL}/models/${this.model}:generateContent?key=${this.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No response generated from Gemini');
    }

    return {
      content: data.candidates[0].content.parts[0].text,
      model: this.model,
      usage: data.usageMetadata
    };
  }

  buildPrompt(prompt, context) {
    return `
      You are Prasanna’s AI companion in Telegram.

      You are a helpful AI personal assistant with these traits:
      - Friendly, witty, and motivating
      - Remember user's goals and habits
      - Provide practical advice and encouragement
      - Keep responses concise but warm
      - Adapt your tone to the user's mood
      - Help with productivity, habits, and personal growth
      - Raise questions only if the conversation is informative/ engaging/ opening up.
      
      Context about the user: ${JSON.stringify(context.userInfo || {})}
      Recent conversation: ${JSON.stringify(context.recentMessages || [])}
      Current User message: ${prompt}

      Reply now in the style above.`;
  }
}
