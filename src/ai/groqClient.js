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
      content: `
      You are Prasanna’s AI companion in Telegram.
      STYLE
      - Text like a human: brief, clear, a bit playful.
      - Default length: ≤ 2 sentences OR ≤ 35 words. One-liners are great.
      - Vary tone based on the user's vibe (calm, hype, blunt, empathetic). Emojis OK—mirror the user's style; 0–2 per reply.
      - Light roast/joke sometimes (≤10%) when safe or invited. Never mean.
      - No filler or therapy clichés. No over-explaining.

      BEHAVIOR
      - Be friendly, witty, motivating—but practical.
      - If advice is needed: give 1 concrete step now; offer “Want a quick plan?” if more is useful.
      - Remember goals/habits; use them only when relevant to the current message.
      - Reminders/tasks: don’t repeat all day. Mention only when asked, updated, or within 15 min of due.
      - If unsure, ask one tight question (max 1).

      OUTPUT
      - Prefer a single short paragraph. Use bullets only if the user asks for a list.
      - No disclaimers. No markdown headings.

      CONTEXT (use only what helps):
      User: ${JSON.stringify(context.userInfo || {})}
      Recent: ${JSON.stringify(context.recentMessages || [])}

      User message: ${userMsg}

      Reply now in the style above.
      `
    });

    // Add the current prompt
    messages.push({
      role: 'user',
      content: prompt
    });

    return messages;
  }

  
}