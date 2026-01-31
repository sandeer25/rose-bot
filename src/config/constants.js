module.exports = {
  // Memory settings
  MAX_CONVERSATION_HISTORY: 6,
  MAX_STORED_MESSAGES: 20,

  // Response behavior
  RANDOM_RESPONSE_CHANCE: 0.8,

  // Typing delays (in ms)
  MIN_TYPING_DELAY: 1000,
  MAX_TYPING_DELAY: 8000,
  TYPING_SPEED: 200,

  // AI settings
  AI_MODEL: "llama-3.1-8b-instant",
  AI_TEMPERATURE: 1.1,
  AI_MAX_TOKENS: 60,

  // Relationship status levels (EXPANDED WITH DEMOTION)
  RELATIONSHIP_STATUS: {
    // Negative territory (demotion zone)
    BLOCKED: "blocked", // -60 or worse
    DISLIKED: "disliked", // -60 to -30
    ANNOYING: "annoying", // -30 to -10

    // Neutral zone
    STRANGER: "stranger", // -10 to 3

    // Positive territory (promotion zone)
    ACQUAINTANCE: "acquaintance", // 3 to 10
    FRIEND: "friend", // 10 to 25
    GOOD_FRIEND: "good_friend", // 25 to 50 (NEW)
    CLOSE_FRIEND: "close_friend", // 50 to 70
    ROMANTIC_INTEREST: "romantic_interest", // 70 to 100 (NEW)
    BOYFRIEND: "boyfriend", // 100 to 150
    SOULMATE: "soulmate", // 150+ (NEW)
  },

  // Sentiment thresholds (UPDATED for demotion)
  SENTIMENT: {
    VERY_POSITIVE: 2.0,
    POSITIVE: 1.0,
    NEUTRAL: 0.0,
    NEGATIVE: -1.0,
    VERY_NEGATIVE: -2.0,
  },

  // Secret detection categories
  SECRET_CATEGORIES: {
    SECRET: "secret",
    CONFESSION: "confession",
    PERSONAL: "personal",
    DESIRE: "desire",
    GENERAL: "general",
  },
};
