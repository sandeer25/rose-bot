const {
  initializeBot: initTelegram,
  stopBot: stopTelegram,
} = require("./src/bot/telegram");
const { initializeWhatsApp, stopWhatsApp } = require("./src/bot/whatsapp");
const { AI_MODEL, RANDOM_RESPONSE_CHANCE } = require("./src/config/constants");
const { syncSequences } = require("./src/database/conversations");

console.log("Rose v2.1 is starting...");

Promise.all([initTelegram(), initializeWhatsApp()]).then(() => {
  console.log("Rose is ready on Telegram + WhatsApp!");
  console.log(`Using Groq AI (${AI_MODEL})`);
  console.log("PostgreSQL with relationship tracking");
  console.log("Dynamic relationship evolution system");
  console.log(
    `Responds when mentioned or ${RANDOM_RESPONSE_CHANCE * 100}% randomly`,
  );

  // Sync sequences on startup
  syncSequences();

  // Sync sequences every hour as backup (active sync happens every 5min during usage)
  setInterval(
    async () => {
      console.log("Running hourly sequence sync backup...");
      await syncSequences();
    },
    60 * 60 * 1000,
  ); // Every hour
});

process.on("SIGINT", () => {
  console.log("\nShutting down Rose...");
  stopTelegram();
  stopWhatsApp();
  process.exit(0);
});
