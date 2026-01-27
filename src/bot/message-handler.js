const { ensureUser, recordInteraction } = require("../database/users");
const { getAIResponse } = require("../ai/groq");
const {
  getTypingDelay,
  shouldRespond,
  analyzeSentiment,
  getInteractionType,
} = require("../utils/helpers");

async function handleMessage(bot, msg, botInfo) {
  try {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const userName = msg.from.username || "user" + userId;
    const firstName = msg.from.first_name || "Unknown";
    const userMessage = msg.text || "";
    const isGroup = msg.chat.type === "group" || msg.chat.type === "supergroup";

    if (!userMessage || msg.from.is_bot) {
      return;
    }

    const userStatus = await ensureUser(userId, userName, firstName);
    console.log(
      `${firstName} (${userId}) in ${isGroup ? "group" : "private"}: ${userMessage}`,
    );

    if (!shouldRespond(msg, isGroup, botInfo)) {
      return;
    }

    // Analyze sentiment and record interaction
    const sentiment = analyzeSentiment(userMessage);
    const interactionType = getInteractionType(sentiment);
    await recordInteraction(userId, interactionType, sentiment);

    const delay = getTypingDelay(userMessage.length);
    await bot.sendChatAction(chatId, "typing");
    await new Promise((resolve) => setTimeout(resolve, delay));

    await bot.sendChatAction(chatId, "stop");

    const response = await getAIResponse(
      userId,
      firstName,
      userMessage,
      userStatus === "new",
    );

    console.log(`Rose: ${response}`);
    await bot.sendMessage(chatId, response);
  } catch (error) {
    console.error("Error handling message:", error);
  }
}

module.exports = {
  handleMessage,
};
