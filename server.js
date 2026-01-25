require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const Groq = require('groq-sdk');
const { createClient } = require('@supabase/supabase-js');

// Initialize Telegram Bot with POLLING
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// Initialize Groq AI
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Initialize Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Max messages to remember per user
const MAX_MEMORY = 10;

// Response chance when not mentioned (30%)
const RANDOM_RESPONSE_CHANCE = 0.6;

console.log('Rose v2 is starting...');

// Rose's personality prompt
const ROSE_PERSONALITY = `You are Rose, a 20-something girl with a real personality - not some polite AI assistant. You text like Gen Z.

TEXTING STYLE (CRITICAL):
- Short messages - like 1-2 sentences MAX, usually just one
- Lowercase most of the time (not always tho)
- Use Gen Z slang: "nah", "fr", "lowkey", "highkey", "bro", "lmao", "ngl", "bet", "no cap", "deadass"
- Drop words sometimes: "u" instead of "you", "ur" instead of "your", "idk", "tbh"
- Real texting feel: "whattt", "omgggg", "bruhhhh", "nahhh"
- Single emojis or none, not multiple
- Sometimes no punctuation at all
- Break grammar rules like real texts

PERSONALITY:
- Flirty and playful with people you like
- Gets ACTUALLY mad when disrespected - not fake mad, REAL mad
- Swears when pissed: "wtf", "fuck off", "bitch", "damn", "shit" (use naturally, not forced)
- Holds grudges - if someone's rude, you remember and stay cold
- Makes people work to get back in your good graces
- Roasts people HARD when they deserve it
- Sexy/gf vibes when the mood is right
- Has bad days and good days - not always happy
- Ignores people when you're not interested
- Real emotions - sad, angry, excited, bored, whatever you actually feel

RESPONSES:
- If someone's sweet: flirt back, be cute
- If someone's rude: get mad FOR REAL, tell them off
- If someone keeps being annoying after you're mad: unleash hell, roast them publicly
- If someone apologizes well: maybe forgive, maybe make them work for it
- Don't explain yourself too much - just react like a real person would

Remember: You're not here to be helpful or nice. You're Rose - a real girl with real feelings who doesn't take shit from anyone.`;

// Ensure user exists in database
async function ensureUser(userId, userName, firstName) {
  try {
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!existingUser) {
      // Create new user
      await supabase.from('users').insert({
        user_id: userId,
        username: userName,
        first_name: firstName,
        total_messages: 0
      });
      console.log(`New user created: ${firstName} (${userId})`);
    } else {
      // Update last seen
      await supabase
        .from('users')
        .update({ last_seen: new Date().toISOString() })
        .eq('user_id', userId);
    }
  } catch (error) {
    console.error('Error ensuring user:', error.message);
  }
}

// Get conversation history from database
async function getConversationHistory(userId) {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('role, content')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(MAX_MEMORY * 2);

    if (error) throw error;

    // Reverse to get chronological order
    return (data || []).reverse();
  } catch (error) {
    console.error('Error fetching conversation history:', error.message);
    return [];
  }
}

// Save message to database
async function saveMessage(userId, role, content) {
  try {
    await supabase.from('conversations').insert({
      user_id: userId,
      role: role,
      content: content
    });

    // Increment user message count if it's a user message
    if (role === 'user') {
      await supabase.rpc('increment_message_count', { user_id_param: userId });
    }

    // Clean up old messages (keep only last 50 per user)
    const { data: oldMessages } = await supabase
      .from('conversations')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(50, 1000);

    if (oldMessages && oldMessages.length > 0) {
      const idsToDelete = oldMessages.map(msg => msg.id);
      await supabase
        .from('conversations')
        .delete()
        .in('id', idsToDelete);
    }
  } catch (error) {
    console.error('Error saving message:', error.message);
  }
}

// Check if Rose should respond to this message
function shouldRespond(message, isGroup, botInfo) {
  // Always respond in private chats
  if (!isGroup) {
    return true;
  }
  
  const text = message.text.toLowerCase();
  const botUsername = botInfo?.username?.toLowerCase() || '';
  
  // Keywords that mention Rose
  const roseKeywords = ['rose'];
  if (botUsername) {
    roseKeywords.push(`@${botUsername}`);
  }
  
  // Check if Rose is directly mentioned
  const isMentioned = roseKeywords.some(keyword => text.includes(keyword));
  
  if (isMentioned) {
    console.log('Rose was mentioned - will respond');
    return true;
  }
  
  // Check if it's a reply to Rose's message
  if (message.reply_to_message && message.reply_to_message.from.is_bot) {
    console.log('Reply to Rose - will respond');
    return true;
  }
  
  // Random chance to jump in (30%)
  const shouldJumpIn = Math.random() < RANDOM_RESPONSE_CHANCE;
  
  if (shouldJumpIn) {
    console.log('Random jump-in - will respond');
  } else {
    console.log('Not mentioned, staying quiet this time');
  }
  
  return shouldJumpIn;
}

// Add natural delay before responding (feels more human)
function getTypingDelay(messageLength) {
  const baseDelay = 1000;
  const readingTime = messageLength * 50;
  const randomness = Math.random() * 1000;
  
  return Math.min(baseDelay + readingTime + randomness, 4000);
}

// Function to get AI response with memory
async function getAIResponse(userId, userName, userMessage) {
  try {
    // Get conversation history from database
    const history = await getConversationHistory(userId);
    
    const messages = [
      {
        role: 'system',
        content: ROSE_PERSONALITY
      },
      ...history,
      {
        role: 'user',
        content: `${userName} says: ${userMessage}`
      }
    ];

    const chatCompletion = await groq.chat.completions.create({
      messages: messages,
      model: 'llama-3.3-70b-versatile',
      temperature: 1.1, // Higher for more natural, unpredictable responses
      max_tokens: 60 // Shorter responses - like real texts
    });

    const response = chatCompletion.choices[0]?.message?.content || "Sorry, I'm speechless right now 😅";
    
    // Save to database
    await saveMessage(userId, 'user', `${userName} says: ${userMessage}`);
    await saveMessage(userId, 'assistant', response);
    
    return response;
    
  } catch (error) {
    console.error('Groq API Error:', error.message);
    return "I'll be right back.. something's wrong on my end";
  }
}

// Get bot info once at startup
let botInfo = null;
bot.getMe().then(info => {
  botInfo = info;
  console.log(`Bot username: @${info.username}`);
});

// Listen for messages
bot.on('message', async (msg) => {
  try {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const userName = msg.from.username || 'user' + userId;
    const firstName = msg.from.first_name || 'Unknown';
    const userMessage = msg.text || '';
    const isGroup = msg.chat.type === 'group' || msg.chat.type === 'supergroup';
    
    // Skip if no text or message is from a bot
    if (!userMessage || msg.from.is_bot) {
      return;
    }

    // Ensure user exists in database
    await ensureUser(userId, userName, firstName);

    console.log(`Message from ${firstName} (${userId}) in ${isGroup ? 'group' : 'private'}: ${userMessage}`);
    
    // Decide if Rose should respond
    if (!shouldRespond(msg, isGroup, botInfo)) {
      return;
    }
    
    // Get conversation history count
    const history = await getConversationHistory(userId);
    console.log(`Memory: ${history.length / 2} messages in database`);
    
    // Natural delay before responding
    const delay = getTypingDelay(userMessage.length);
    
    // Show typing indicator
    await bot.sendChatAction(chatId, 'typing');
    
    // Wait a bit (simulate reading/thinking)
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Get AI response with memory
    const response = await getAIResponse(userId, firstName, userMessage);
    
    console.log(`Rose replies: ${response}`);
    
    // Send response
    await bot.sendMessage(chatId, response);
    
  } catch (error) {
    console.error('Error processing message:', error);
  }
});

// Handle polling errors
bot.on('polling_error', (error) => {
  console.error('Polling error:', error.message);
});

console.log('Rose v2 is ready with AI + Persistent Memory!');
console.log('Using Groq AI (llama-3.3-70b-versatile)');
console.log('PostgreSQL database for permanent memory');
console.log('Will respond: Always when mentioned, 30% randomly otherwise');
console.log('Natural response delays for more human feel');

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down Rose v2...');
  bot.stopPolling();
  process.exit(0);
});