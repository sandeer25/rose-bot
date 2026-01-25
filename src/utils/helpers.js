const {
  MIN_TYPING_DELAY,
  MAX_TYPING_DELAY,
  TYPING_SPEED,
  RANDOM_RESPONSE_CHANCE,
  SENTIMENT,
} = require("../config/constants");

function getTypingDelay(messageLength) {
  const baseDelay = MIN_TYPING_DELAY;
  const readingTime = messageLength * TYPING_SPEED;
  const randomness = Math.random() * 1000;

  return Math.min(baseDelay + readingTime + randomness, MAX_TYPING_DELAY);
}

function shouldRespond(message, isGroup, botInfo) {
  if (!isGroup) {
    return true;
  }

  const text = message.text.toLowerCase();
  const botUsername = botInfo?.username?.toLowerCase() || "";

  const roseKeywords = ["rose"];
  if (botUsername) {
    roseKeywords.push(`@${botUsername}`);
  }

  const isMentioned = roseKeywords.some((keyword) => text.includes(keyword));

  if (isMentioned) {
    console.log("Rose was mentioned");
    return true;
  }

  if (message.reply_to_message && message.reply_to_message.from.is_bot) {
    console.log("Reply to Rose");
    return true;
  }

  const shouldJumpIn = Math.random() < RANDOM_RESPONSE_CHANCE;

  if (shouldJumpIn) {
    console.log("Random jump-in");
  } else {
    console.log("Staying quiet");
  }

  return shouldJumpIn;
}

// Analyze message sentiment
function analyzeSentiment(message) {
  const text = message.toLowerCase();

  // Positive keywords
  const positiveWords = [
    "love",
    "cute",
    "beautiful",
    "pretty",
    "sweet",
    "amazing",
    "awesome",
    "thanks",
    "thank you",
    "appreciate",
    "gorgeous",
    "perfect",
    "wonderful",
    "best",
  ];
  const veryPositiveWords = ["adore", "obsessed", "incredible", "stunning"];

  // Negative keywords
  const negativeWords = [
    "hate",
    "ugly",
    "stupid",
    "dumb",
    "idiot",
    "annoying",
    "shut up",
    "fuck off",
  ];
  const veryNegativeWords = ["bitch", "ass", "shit", "pathetic", "loser"];

  let score = 0;

  // Check very positive
  if (veryPositiveWords.some((word) => text.includes(word))) {
    score += SENTIMENT.VERY_POSITIVE;
  }
  // Check positive
  else if (positiveWords.some((word) => text.includes(word))) {
    score += SENTIMENT.POSITIVE;
  }

  // Check very negative
  if (veryNegativeWords.some((word) => text.includes(word))) {
    score += SENTIMENT.VERY_NEGATIVE;
  }
  // Check negative
  else if (negativeWords.some((word) => text.includes(word))) {
    score += SENTIMENT.NEGATIVE;
  }

  return score;
}

function getInteractionType(sentiment) {
  if (sentiment >= SENTIMENT.VERY_POSITIVE) return "very_positive";
  if (sentiment >= SENTIMENT.POSITIVE) return "positive";
  if (sentiment <= SENTIMENT.VERY_NEGATIVE) return "very_negative";
  if (sentiment <= SENTIMENT.NEGATIVE) return "negative";
  return "neutral";
}

module.exports = {
  getTypingDelay,
  shouldRespond,
  analyzeSentiment,
  getInteractionType,
};
