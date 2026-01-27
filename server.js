const {
  initializeBot: initTelegram,
  stopBot: stopTelegram,
} = require("./src/bot/telegram");
const { initializeWhatsApp, stopWhatsApp } = require("./src/bot/whatsapp");
const { AI_MODEL, RANDOM_RESPONSE_CHANCE } = require("./src/config/constants");

console.log("Rose v2.1 is starting...");

Promise.all([initTelegram(), initializeWhatsApp()]).then(() => {
  console.log("Rose is ready on Telegram + WhatsApp!");
  console.log(`Using Groq AI (${AI_MODEL})`);
  console.log("PostgreSQL with relationship tracking");
  console.log("Dynamic relationship evolution system");
  console.log(
    `Responds when mentioned or ${RANDOM_RESPONSE_CHANCE * 100}% randomly`,
  );
});

process.on("SIGINT", () => {
  console.log("\nShutting down Rose...");
  stopTelegram();
  stopWhatsApp();
  process.exit(0);
});
