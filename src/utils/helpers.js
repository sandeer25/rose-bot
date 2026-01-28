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
  
  // Sexual/flirty content (positive in Rose's context)
  const sexualFlirtyWords = [
    'dick', 'cock', 'pussy', 'tits', 'ass', 'fuck', 'sex', 'sexy', 
    'hot', 'horny', 'hard', 'wet', 'cum', 'suck', 'touch', 'kiss',
    'babe', 'baby', 'daddy', 'mommy', 'please', 'want you', 'need you',
    'make love', 'sleep with', 'bed', 'naked', 'nude', 'body',
    'finish', 'help me', 'soft', 'gentle', 'ready', 'waiting',
    'breast', 'boobs', 'booty', 'play', 'tease', 'desire', 'lust',
    'feel', 'stroke', 'lick', 'bite', 'moan', 'ride', 'deep',
    'inside', 'tight', 'harder', 'faster', 'slow down', 'edge',
    'closer', 'come here', 'get over', 'oil', 'rub', 'slippery',
    'scream', 'voice', 'ears', 'sweat', 'taste', 'experience',
    'wild', 'crazy', 'tied', 'helpless', 'tongue', 'explode',
    'mmm', 'ahh', 'ohh', 'umm', 'squeeze', 'dripping', 'throbbing'
  ];
  
  // Positive keywords
  const positiveWords = [
    'love', 'cute', 'beautiful', 'pretty', 'sweet', 'amazing', 'awesome', 
    'thanks', 'thank you', 'appreciate', 'gorgeous', 'perfect', 'wonderful', 
    'best', 'great', 'nice', 'good', 'like', 'happy', 'haha', 'lol', 'lmao',
    'cool', 'fun', 'buddy', 'friend', 'bro', 'sis', 'hey', 'hi', 'hello',
    'miss you', 'thinking of you', 'excited', 'smile', 'definitely', 'yes',
    'alright', 'okay', 'sounds good', 'for sure',
    '😊', '😂', '🥰', '💕', '❤️', '💖', '😘', '🤗', '👍', '✨', '🔥'
  ];
  
  const veryPositiveWords = [
    'adore', 'obsessed', 'incredible', 'stunning', 'marry', 'forever',
    'soulmate', 'everything', 'world', 'dream', 'angel', 'goddess',
    'heaven', 'divine', 'worship'
  ];
  
  // Negative keywords (actually negative - not sexual)
  const negativeWords = [
    'hate', 'ugly', 'stupid', 'dumb', 'idiot', 'annoying', 'shut up', 
    'fuck off', 'boring', 'lame', 'terrible', 'worst', 'bad', 'no way',
    'disgusting', 'gross', 'leave me', 'go away', 'stop it'
  ];
  
  const veryNegativeWords = [
    'bitch', 'pathetic', 'loser', 'worthless', 'die', 'kill',
    'slut', 'whore', 'trash'
  ];
  
  let score = 0;
  
  // Check sexual/flirty content (these are POSITIVE in Rose's context)
  const sexualCount = sexualFlirtyWords.filter(word => text.includes(word)).length;
  if (sexualCount > 0) {
    // More sexual words = more positive
    score += Math.min(sexualCount, 3) * SENTIMENT.POSITIVE;
  }
  
  // Check very positive
  const veryPosCount = veryPositiveWords.filter(word => text.includes(word)).length;
  score += veryPosCount * SENTIMENT.VERY_POSITIVE;
  
  // Check positive
  const posCount = positiveWords.filter(word => text.includes(word)).length;
  score += posCount * SENTIMENT.POSITIVE;
  
  // Check very negative (but NOT if it's used in sexual context)
  const veryNegCount = veryNegativeWords.filter(word => text.includes(word)).length;
  if (veryNegCount > 0 && sexualCount === 0) {
    score += veryNegCount * SENTIMENT.VERY_NEGATIVE;
  }
  
  // Check negative (but NOT if there's sexual/positive context)
  const negCount = negativeWords.filter(word => text.includes(word)).length;
  if (negCount > 0 && sexualCount === 0 && posCount === 0) {
    score += negCount * SENTIMENT.NEGATIVE;
  }

  console.log(`Sentiment: "${text.substring(0, 50)}..." = ${score} (sexual:${sexualCount}, pos:${posCount}, neg:${negCount})`);
  
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