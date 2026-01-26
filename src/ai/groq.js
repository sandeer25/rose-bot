const Groq = require("groq-sdk");
const config = require("../config/env");
const {
  AI_MODEL,
  AI_TEMPERATURE,
  AI_MAX_TOKENS,
} = require("../config/constants");
const {
  getPersonalityWithContext,
} = require("../personality/base-personality");
const {
  getConversationHistory,
  saveMessage,
} = require("../database/conversations");
const {
  getUserRelationshipStatus,
  getAllBoyfriends,
} = require("../database/users");

const groq = new Groq({ apiKey: config.groq.apiKey });

async function getAIResponse(userId, userName, userMessage, isNewUser = false) {
  try {
    const history = await getConversationHistory(userId);
    const userRelationship = await getUserRelationshipStatus(userId);
    const boyfriends = await getAllBoyfriends();

    // Build relationship context
    let relationshipContext = "";

    if (boyfriends.length > 0) {
      const bfNames = boyfriends.map((bf) => bf.first_name).join(", ");
      relationshipContext = `\n\nIMPORTANT: You're in relationships with: ${bfNames}. You're loyal to them, defend them, and tell others you're taken by them. 💕`;
    } else {
      relationshipContext = `\n\nYou're currently single and open to connections. 💕`;
    }

    // Add current user's relationship status
    relationshipContext += `\n\nYour relationship with ${userName}: ${userRelationship.relationship_status} (sentiment: ${userRelationship.sentiment_score.toFixed(1)})`;

    const personalityPrompt = getPersonalityWithContext(
      relationshipContext,
      isNewUser,
      userName,
    );

    const messages = [
      { role: "system", content: personalityPrompt },
      ...history,
      { role: "user", content: `${userName} says: ${userMessage}` },
    ];

    const chatCompletion = await groq.chat.completions.create({
      messages: messages,
      model: AI_MODEL,
      temperature: AI_TEMPERATURE,
      max_tokens: AI_MAX_TOKENS,
    });

    const response = chatCompletion.choices[0]?.message?.content || "...";

    await saveMessage(userId, "user", `${userName} says: ${userMessage}`);
    await saveMessage(userId, "assistant", response);

    return response;
  } catch (error) {
    console.error("Groq API Error:", error);

    if (error?.status === 429 || error?.code === "rate_limit_exceeded") {
      const match = error.message?.match(/try again in (\d+)m(\d+)?/i);

      let waitText = "a few minutes";

      if (match) {
        const minutes = parseInt(match[1], 10);
        const seconds = match[2] ? parseInt(match[2], 10) : 0;

        // round UP if there are any seconds
        const roundedMinutes = seconds > 0 ? minutes + 1 : minutes;

        waitText =
          roundedMinutes === 1 ? "a minute" : `${roundedMinutes} minutes`;
      }

      return `ugh babe 😩 gimme ${waitText}, I’ll be right back 💕`;
    }

    return "oh babe something feels off 😕 gimme a sec, I’ll fix it";
  }
}

module.exports = {
  getAIResponse,
};
