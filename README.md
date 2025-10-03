# 🤖 Telegram AI Assistant Bot

A powerful, serverless Telegram bot powered by multiple AI models (Groq, Gemini) running on Cloudflare Workers. Built for speed, scalability, and easy deployment.
Focused on being your Personal Assistant, Coach and Chat buddy who gathers information from normal conversations with the bot. Capable of chatting, reminding, track habits and even store documents and media.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com/)
[![Telegram Bot API](https://img.shields.io/badge/Telegram-Bot%20API-blue)](https://core.telegram.org/bots/api)

## ✨ Features

- 🧠 **Multi-Model AI Support** - Integrates with Groq and Google Gemini for intelligent responses
- ⚡ **Serverless Architecture** - Runs on Cloudflare Workers for global low-latency performance
- 💾 **Persistent Storage** - Uses Cloudflare D1 (SQLite) for conversation history and user data
- 🔄 **Context-Aware Conversations** - Maintains conversation context for natural interactions
- 🎯 **Command-Based Interface** - Easy-to-use commands for bot interaction
- 🔒 **Secure** - API keys managed through Cloudflare secrets
- 🌍 **Global CDN** - Deployed across Cloudflare's edge network

## 🚀 Tech Stack

### Runtime & Infrastructure
- **[Cloudflare Workers](https://workers.cloudflare.com/)** - Serverless compute platform
- **[Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)** - Cloudflare Workers CLI tool

### Database & Storage
- **[Cloudflare D1](https://developers.cloudflare.com/d1/)** - Serverless SQL database
- **[Cloudflare KV](https://developers.cloudflare.com/kv/)** - Key-value storage for session data

### AI Models & APIs
- **[Groq API](https://groq.com/)** - Ultra-fast LLM inference
- **[Google Gemini API](https://ai.google.dev/)** - Google's advanced AI model
- **[Telegram Bot API](https://core.telegram.org/bots/api)** - Bot platform integration

### Language & Framework
- **JavaScript/TypeScript** - Bot logic and API integrations
- **Node.js** - Development environment

## 📋 Current Features

- ✅ Natural language conversations with AI
- ✅ Multi-turn conversation support with context
- ✅ User session management
- ✅ Command-based interactions
- ✅ Message history storage
- ✅ Multi-environment support (development/production)
- ✅ Automatic webhook setup
- ✅ Error handling and logging

## 🎯 Future Plans

- 🔜 Image generation capabilities
- 🔜 Voice message support
- 🔜 Multi-language support
- 🔜 User preferences and settings
- 🔜 Rate limiting and usage quotas
- 🔜 Analytics and usage dashboard
- 🔜 Plugin system for extensibility
- 🔜 Group chat support with mentions
- 🔜 Document analysis and summarization
- 🔜 Custom AI model integration

## 🛠️ Setup & Installation

### Prerequisites

- Node.js 16+ installed
- Cloudflare account ([sign up here](https://dash.cloudflare.com/sign-up))
- Telegram Bot Token (create one via [@BotFather](https://t.me/botfather))
- Groq API Key ([get one here](https://console.groq.com/))
- Gemini API Key ([get one here](https://aistudio.google.com/app/apikey))

### Step 1: Install Wrangler CLI

```bash
npm install -g wrangler
```

Verify installation and login:

```bash
wrangler whoami
wrangler login
```

### Step 2: Clone the Repository

```bash
git clone https://github.com/yourusername/telegram-ai-bot.git
cd telegram-ai-bot
```

### Step 3: Create Cloudflare Resources

#### Create D1 Databases

```bash
# Production database
wrangler d1 create telegram-ai-bot > d1_output.txt

# Development database
wrangler d1 create telegram-ai-bot-dev > d2_output.txt
```

#### Create KV Namespaces

```bash
# Production KV
wrangler kv namespace create "telegram-ai-assistant" > kv1_output.txt

# Development KV
wrangler kv namespace create "telegram-ai-assistant-dev" > kv2_output.txt
```

### Step 4: Configure `wrangler.toml`

Copy the example configuration and update with your resource IDs:

```bash
cp wrangler.toml.example wrangler.toml
```

Open `wrangler.toml` and fill in the IDs from the output files created in Step 3.

### Step 5: Set Secrets

You can set secrets via CLI or Cloudflare Dashboard.

#### Option A: Using Wrangler CLI

```bash
# Production secrets
wrangler secret put TELEGRAM_BOT_TOKEN --env production
wrangler secret put GROQ_API_KEY --env production
wrangler secret put GEMINI_API_KEY --env production

# Development secrets
wrangler secret put TELEGRAM_BOT_TOKEN --env development
wrangler secret put GROQ_API_KEY --env development
wrangler secret put GEMINI_API_KEY --env development
```

#### Option B: Using Cloudflare Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Workers & Pages** > Your Worker > **Settings** > **Variables**
3. Add the secrets under **Environment Variables**

### Step 6: Run Database Migrations

```bash
# Development environment
wrangler d1 migrations apply telegram-ai-bot-dev --env development --remote

# Production environment
wrangler d1 migrations apply telegram-ai-bot --env production --remote
```

### Step 7: Deploy the Worker

```bash
# Deploy to development
wrangler deploy --env development

# Deploy to production
wrangler deploy --env production
```

### Step 8: Set Up Telegram Webhook

Replace `[TELEGRAM_BOT_TOKEN]` with your bot token and `[WORKER-URL]` with your Worker URL:

```bash
# Your worker URL format
https://<your-worker-name>.<your-subdomain>.workers.dev
```

Set the webhook:

```bash
https://api.telegram.org/bot[TELEGRAM_BOT_TOKEN]/setWebhook?url=[WORKER-URL]/webhook
```

### Step 9: Verify Setup

Check if everything is working:

```bash
# Verify webhook
https://api.telegram.org/bot[TELEGRAM_BOT_TOKEN]/getWebhookInfo

# Verify bot
https://api.telegram.org/bot[TELEGRAM_BOT_TOKEN]/getMe

```

## 📝 Usage

Once deployed, interact with your bot on Telegram:

- `/start` - Initialize the bot
- `/help` - Show available commands
- Just type any message to chat with the AI!

## 🐛 Debugging

View real-time logs:

```bash
wrangler tail --env=development
```

Check your Worker status:

```
https://<your-worker-name>.<your-subdomain>.workers.dev
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Cloudflare Workers](https://workers.cloudflare.com/) for the amazing serverless platform
- [Groq](https://groq.com/) for ultra-fast AI inference for it's generous free tier
- [Google Gemini](https://ai.google.dev/) for advanced AI capabilities and image generation free tier
- [Telegram](https://telegram.org/) for the Bot API

## 📧 Support

If you have any questions or run into issues, please [open an issue](https://github.com/yourusername/telegram-ai-bot/issues) on GitHub.

---

<div align="center">
Made with ❤️ for the Open Source Community
</div>
