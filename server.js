const { initializeBot, stopBot } = require("./src/bot/telegram");

console.log("Rose v2.1 is starting...");

initializeBot().then(() => {
  console.log("Rose is ready with AI + Dynamic Relationships!");
  console.log("Using Groq AI (llama-3.3-70b-versatile)");
  console.log("PostgreSQL with relationship tracking");
  console.log("Dynamic relationship evolution system");
  console.log("Responds when mentioned or 30% randomly");
});

process.on("SIGINT", () => {
  console.log("\nShutting down Rose...");
  stopBot();
  process.exit(0);
});
