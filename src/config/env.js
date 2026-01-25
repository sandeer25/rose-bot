require("dotenv").config();

module.exports = {
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
  },
  groq: {
    apiKey: process.env.GROQ_API_KEY,
  },
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
  },
  server: {
    port: process.env.PORT || 3000,
  },
};
