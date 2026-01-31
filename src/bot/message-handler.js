const { ensureUser, recordInteraction, saveSecret } = require("../database/users");
const { getAIResponse } = require("../ai/groq");
const {
  getTypingDelay,
  shouldRespond,
  analyzeSentiment,
  getInteractionType,
} = require("../utils/helpers");

// SECRET DETECTION PATTERNS
const SECRET_PATTERNS = {
  // Explicit secret markers
  explicit: [
    /don'?t tell (?:anyone|anybody)/i,
    /keep (?:this|it) (?:a )?secret/i,
    /(?:this is |it'?s )?between (?:us|you and me)/i,
    /(?:just|only) between us/i,
    /can you keep a secret/i,
    /i shouldn'?t (?:be )?(?:tell|say)(?:ing)? (?:this|you)/i,
    /promise (?:you |to )?(?:won'?t|not) tell/i,
  ],
  
  // Confessional markers
  confessional: [
    /i have to (?:confess|admit|tell you)/i,
    /confession:/i,
    /(?:to be |being )?honest/i,
    /truth is/i,
    /i'?(?:ve)? never told (?:anyone|anybody)/i,
    /nobody knows (?:this|about)/i,
  ],
  
  // Personal/vulnerable information
  personal: [
    /i (?:have|had) a crush on/i,
    /i'?m (?:really |secretly )?(?:in love with|attracted to)/i,
    /i (?:think|fantasize|dream) about/i,
    /i want(?:ed)? to (?:fuck|kiss|touch|be with)/i,
    /(?:my|our) (?:first time|virginity)/i,
    /i'?ve been (?:cheating|hiding|lying)/i,
  ],
  
  // Desires/fantasies
  desires: [
    /i'?ve always wanted to/i,
    /(?:my|a) (?:fantasy|dream|desire) is/i,
    /i wish (?:i could|we could)/i,
    /what i really want/i,
  ],
};

// Analyze if message contains a secret
function detectSecret(message) {
  const text = message.toLowerCase();
  let detected = {
    isSecret: false,
    category: 'general',
    confidence: 0,
    triggers: []
  };
  
  // Check explicit markers (highest confidence)
  for (const pattern of SECRET_PATTERNS.explicit) {
    if (pattern.test(text)) {
      detected.isSecret = true;
      detected.category = 'secret';
      detected.confidence = Math.max(detected.confidence, 0.9);
      detected.triggers.push('explicit_marker');
    }
  }
  
  // Check confessional markers
  for (const pattern of SECRET_PATTERNS.confessional) {
    if (pattern.test(text)) {
      detected.isSecret = true;
      detected.category = 'confession';
      detected.confidence = Math.max(detected.confidence, 0.7);
      detected.triggers.push('confessional');
    }
  }
  
  // Check personal information
  for (const pattern of SECRET_PATTERNS.personal) {
    if (pattern.test(text)) {
      detected.isSecret = true;
      detected.category = 'personal';
      detected.confidence = Math.max(detected.confidence, 0.8);
      detected.triggers.push('personal_info');
    }
  }
  
  // Check desires/fantasies
  for (const pattern of SECRET_PATTERNS.desires) {
    if (pattern.test(text)) {
      detected.isSecret = true;
      detected.category = 'desire';
      detected.confidence = Math.max(detected.confidence, 0.6);
      detected.triggers.push('desire');
    }
  }
  
  return detected;
}

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

    // ===== SECRET DETECTION =====
    const secretDetection = detectSecret(userMessage);
    
    if (secretDetection.isSecret && secretDetection.confidence >= 0.6) {
      console.log(`SECRET DETECTED! Category: ${secretDetection.category}, Confidence: ${secretDetection.confidence}`);
      
      // Save the secret
      await saveSecret(userId, userMessage, secretDetection.category);
      
      // Log which patterns triggered
      console.log(`   Triggers: ${secretDetection.triggers.join(', ')}`);
    }
    // ===== END SECRET DETECTION =====

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