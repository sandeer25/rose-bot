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

// Token estimation helper (rough approximation: 1 token ≈ 4 characters)
function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

// Compress conversation history to fit within token budget
function compressHistory(history, maxTokens = 600) {
  if (!history || history.length === 0) return [];

  let totalTokens = 0;
  const compressed = [];

  // Work backwards from most recent messages
  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i];
    const msgTokens = estimateTokens(msg.content);

    if (totalTokens + msgTokens > maxTokens) {
      break;
    }

    compressed.unshift(msg); // Add to beginning to maintain order
    totalTokens += msgTokens;
  }

  return compressed;
}

// Create system prompt
function getSystemPrompt(relationshipContext, isNewUser, userName, userRelationship) {
  const basePersonality = getPersonalityWithContext(relationshipContext, isNewUser, userName);
  
  // Add relationship status context
  const relationshipInfo = `\n\nCURRENT DYNAMIC WITH ${userName}:
- Status: ${userRelationship.relationship_status}
- Vibe score: ${userRelationship.sentiment_score.toFixed(0)} (higher = more positive history)
${relationshipContext}`;

  return basePersonality + relationshipInfo;
}

async function getAIResponse(userId, userName, userMessage, isNewUser = false) {
  try {
    // Get conversation history
    const fullHistory = await getConversationHistory(userId);
    const recentHistory = fullHistory.slice(-8); // Last 4 exchanges
    const compressedHistory = compressHistory(recentHistory, 500);

    // Get user relationship data
    const userRelationship = await getUserRelationshipStatus(userId);
    const boyfriends = await getAllBoyfriends();

    // Build relationship context
    let relationshipContext = "";
    if (boyfriends.length > 0) {
      const bfNames = boyfriends.map((bf) => bf.first_name).join(", ");
      relationshipContext = `\nYou're currently with: ${bfNames} (but you're playful/flirty with others too)`;
    }

    // Create system prompt
    const systemPrompt = getSystemPrompt(
      relationshipContext,
      isNewUser,
      userName,
      userRelationship
    );

    // Build message array
    const messages = [
      { role: "system", content: systemPrompt },
      ...compressedHistory,
      { role: "user", content: `${userName}: ${userMessage}` },
    ];

    // Log token usage for monitoring
    const estimatedInputTokens = messages.reduce(
      (sum, msg) => sum + estimateTokens(msg.content),
      0,
    );
    console.log(`Est. tokens: ${estimatedInputTokens}`);

    const chatCompletion = await groq.chat.completions.create({
      messages: messages,
      model: AI_MODEL,
      temperature: AI_TEMPERATURE,
      max_tokens: AI_MAX_TOKENS,
    });

    const response = chatCompletion.choices[0]?.message?.content || "...";

    // Save conversation
    await saveMessage(userId, "user", `${userName}: ${userMessage}`);
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
        const roundedMinutes = seconds > 0 ? minutes + 1 : minutes;
        waitText = roundedMinutes === 1 ? "a minute" : `${roundedMinutes} minutes`;
      }

      return `ugh babe 😩 gimme ${waitText}, I'll be right back 💕`;
    }

    return "fuck, something's off 😕 gimme a sec";
  }
}

module.exports = {
  getAIResponse,
};