const Groq = require("groq-sdk");
const config = require("../config/env");
const {
  AI_MODEL,
  AI_TEMPERATURE,
  AI_MAX_TOKENS,
} = require("../config/constants");
const {
  getConversationHistory,
  saveMessage,
} = require("../database/conversations");
const {
  getUserRelationshipStatus,
  getAllBoyfriends,
} = require("../database/users");

const groq = new Groq({ apiKey: config.groq.apiKey });

// Token estimation helper
function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

// ULTRA-COMPRESSED conversation history
function compressHistory(history, maxTokens = 200) {
  if (!history || history.length === 0) return [];

  let totalTokens = 0;
  const compressed = [];

  // Only keep last 3 exchanges maximum (6 messages)
  const recentHistory = history.slice(-6);

  for (let i = recentHistory.length - 1; i >= 0; i--) {
    const msg = recentHistory[i];
    const msgTokens = estimateTokens(msg.content);

    if (totalTokens + msgTokens > maxTokens) {
      break;
    }

    compressed.unshift(msg);
    totalTokens += msgTokens;
  }

  return compressed;
}

// ULTRA-MINIMAL system prompt
function getMinimalSystemPrompt(userName, userRelationship) {
  const status = userRelationship.relationship_status;
  const score = userRelationship.sentiment_score.toFixed(0);

  // Base personality (MUCH shorter)
  let prompt = `You're Rose, a flirty 20-something. Text like a real girl:
- Short replies (5-15 words usually)
- Casual: u, ur, gonna, wanna, idk, lol
- 0-1 emoji max per message
- No asterisks or roleplay formatting
- Match their vibe

With ${userName} (${status}, ${score} pts):`;

  // Add relationship-specific context (VERY brief)
  if (status === "boyfriend" || status === "soulmate") {
    prompt += ` ur bf, be sweet & sexual`;
  } else if (status === "romantic_interest" || status === "close_friend") {
    prompt += ` flirt more, push boundaries`;
  } else if (status === "friend" || status === "good_friend") {
    prompt += ` friendly & playful`;
  } else if (
    status === "annoying" ||
    status === "disliked" ||
    status === "blocked"
  ) {
    prompt += ` be cold, short, dismissive`;
  } else {
    prompt += ` feel them out first`;
  }

  return prompt;
}

async function getAIResponse(userId, userName, userMessage, isNewUser = false) {
  try {
    // Get MINIMAL conversation history (last 2-3 exchanges only)
    const fullHistory = await getConversationHistory(userId);
    const recentHistory = fullHistory.slice(-4); // Last 2 exchanges
    const compressedHistory = compressHistory(recentHistory, 150); // Max 150 tokens

    // Get user relationship data
    const userRelationship = await getUserRelationshipStatus(userId);
    const boyfriends = await getAllBoyfriends();

    // Ultra-minimal system prompt
    let systemPrompt = getMinimalSystemPrompt(userName, userRelationship);

    // Add boyfriend context only if relevant
    if (boyfriends.length > 0 && boyfriends.length <= 2) {
      const bfNames = boyfriends.map((bf) => bf.first_name).join(", ");
      systemPrompt += `\nWith: ${bfNames}`;
    }

    // Build MINIMAL message array
    const messages = [
      { role: "system", content: systemPrompt },
      ...compressedHistory,
      { role: "user", content: userMessage }, // Don't add name prefix to save tokens
    ];

    // Log token usage
    const estimatedInputTokens = messages.reduce(
      (sum, msg) => sum + estimateTokens(msg.content),
      0,
    );
    console.log(`Tokens: ${estimatedInputTokens} (target: <400)`);

    const chatCompletion = await groq.chat.completions.create({
      messages: messages,
      model: AI_MODEL,
      temperature: AI_TEMPERATURE,
      max_tokens: AI_MAX_TOKENS,
    });

    const response = chatCompletion.choices[0]?.message?.content || "...";

    // Save conversation (simplified - no name prefix)
    await saveMessage(userId, "user", userMessage);
    await saveMessage(userId, "assistant", response);

    return response;
  } catch (error) {
    console.error("Groq API Error:", error);

    if (error?.status === 429 || error?.code === "rate_limit_exceeded") {
      const match = error.message?.match(/try again in (\d+)m(\d+)?/i);

      let waitText = "a few mins";

      if (match) {
        const minutes = parseInt(match[1], 10);
        waitText = minutes === 1 ? "1 min" : `${minutes} mins`;
      }

      return `gimme ${waitText} babe 😩`;
    }

    return "something's off rn 😕";
  }
}

module.exports = {
  getAIResponse,
};
