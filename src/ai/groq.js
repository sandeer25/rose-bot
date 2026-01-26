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
function compressHistory(history, maxTokens = 800) {
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

// Create a compact system prompt
function getCompactSystemPrompt(relationshipContext, isNewUser, userName) {
  // Much shorter base personality
  const compactBase = `You're Rose, a 20s girl. Flirty, confident, sexually open.

STYLE: Short (1-2 lines), casual, Gen Z slang, lowercase
MOOD: Match their vibe - flirty, playful, or call out BS
${relationshipContext}
Current user: ${userName}${isNewUser ? " (new person, feel them out)" : ""}`;

  return compactBase;
}

async function getAIResponse(userId, userName, userMessage, isNewUser = false) {
  try {
    // Get only recent history and compress it
    const fullHistory = await getConversationHistory(userId);
    const recentHistory = fullHistory.slice(-6); // Only last 3 exchanges (6 messages)
    const compressedHistory = compressHistory(recentHistory, 600); // Max 600 tokens for history

    const userRelationship = await getUserRelationshipStatus(userId);
    const boyfriends = await getAllBoyfriends();

    // Build compact relationship context
    let relationshipContext = "";
    if (boyfriends.length > 0) {
      const bfNames = boyfriends.map((bf) => bf.first_name).join(", ");
      relationshipContext = `\nYou're with: ${bfNames}. You're loyal to them.`;
    }
    relationshipContext += `\nWith ${userName}: ${userRelationship.relationship_status} (score: ${userRelationship.sentiment_score.toFixed(0)})`;

    // Use compact system prompt
    const systemPrompt = getCompactSystemPrompt(
      relationshipContext,
      isNewUser,
      userName,
    );

    // Build minimal message array
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
    console.log(`Estimated input tokens: ${estimatedInputTokens}`);

    const chatCompletion = await groq.chat.completions.create({
      messages: messages,
      model: AI_MODEL,
      temperature: AI_TEMPERATURE,
      max_tokens: AI_MAX_TOKENS,
    });

    const response = chatCompletion.choices[0]?.message?.content || "...";

    // Save only the essentials to DB
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
