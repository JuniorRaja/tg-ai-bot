export class GeminiClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://generativelanguage.googleapis.com/v1';
    this.model = 'gemini-2.5-flash'; // or 'gemini-2.5-pro'
  }

  async generateResponse(prompt, context = {}, options = {}) {
    const requestBody = {
      contents: [{
        parts: [{
          text: this.buildPrompt(prompt, context)
        }]
      }],
      generationConfig: {
        temperature: options.temperature || 0.7,
        maxOutputTokens: options.maxTokens || 1000,
        topP: 0.95,
        topK: 64
      }
    };

    const response = await fetch(
      `${this.baseURL}/models/${this.model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      }
    );

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

      Reply now in the style above.`;
  }
}