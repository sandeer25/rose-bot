const { initializeBot, stopBot } = require("./src/bot/telegram");
const { RANDOM_RESPONSE_CHANCE, AI_MODEL } = require("./src/config/constants");

console.log("Rose v2.1 is starting...");

initializeBot().then(() => {
  console.log("Rose is ready with AI + Dynamic Relationships!");
  console.log(`Using Groq AI (${AI_MODEL})`);
  console.log("PostgreSQL with relationship tracking");
  console.log("Dynamic relationship evolution system");
  console.log(`Responds when mentioned or ${RANDOM_RESPONSE_CHANCE * 100}% randomly`);
});

process.on("SIGINT", () => {
  console.log("\nShutting down Rose...");
  stopBot();
  process.exit(0);
});
