export class GroqClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.groq.com/openai/v1';
    this.model = 'llama-3.3-70b-versatile'; // or 'mixtral-8x7b-32768'
  }

  async generateResponse(prompt, context = {}, options = {}) {
    const messages = this.buildMessages(prompt, context);
    
    const requestBody = {
      model: options.model || this.model,
      messages,
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 1000,
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
    
    // System message with personality
    messages.push({
      role: 'system',
      content: `You are a helpful AI personal assistant with these traits:
- Friendly, witty, and motivating
- Remember user's goals and habits
- Provide practical advice and encouragement
- Keep responses concise but warm
- Adapt your tone to the user's mood
- Help with productivity, habits, and personal growth

Context about the user: ${JSON.stringify(context.userInfo || {})}
Recent conversation: ${JSON.stringify(context.recentMessages || [])}`
    });

    // Add the current prompt
    messages.push({
      role: 'user',
      content: prompt
    });

    return messages;
  }
}