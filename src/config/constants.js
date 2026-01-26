module.exports = {
  // Memory settings
  MAX_CONVERSATION_HISTORY: 10,
  MAX_STORED_MESSAGES: 50,

  // Response behavior
  RANDOM_RESPONSE_CHANCE: 0.6,

  // Typing delays (in ms)
  MIN_TYPING_DELAY: 1000,
  MAX_TYPING_DELAY: 4000,
  TYPING_SPEED: 50, // ms per character

  // AI settings
  AI_MODEL: "llama-3.3-70b-versatile",
  AI_TEMPERATURE: 1.1,
  AI_MAX_TOKENS: 80,

  // Relationship status levels
  RELATIONSHIP_STATUS: {
    STRANGER: "stranger",
    ACQUAINTANCE: "acquaintance",
    FRIEND: "friend",
    CLOSE_FRIEND: "close_friend",
    BOYFRIEND: "boyfriend",
  },

  // Sentiment thresholds
  SENTIMENT: {
    VERY_POSITIVE: 2.0,
    POSITIVE: 1.0,
    NEUTRAL: 0.0,
    NEGATIVE: -1.0,
    VERY_NEGATIVE: -2.0,
  },
};
