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
    console.error("Groq API Error:", error.message);
    return "...";
  }
}

module.exports = {
  getAIResponse,
};
