const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const { handleMessage } = require('./message-handler');

let sock = null;
let botInfo = { username: 'rose_whatsapp' };

async function initializeWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('./whatsapp-auth');
  
  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false, // We'll handle QR display ourselves
  });

  // Handle credentials update
  sock.ev.on('creds.update', saveCreds);

  // Handle connection updates
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    if (qr) {
      console.log('\nWhatsApp QR Code - Scan with your phone:\n');
      qrcode.generate(qr, { small: true });
      console.log('\nOpen WhatsApp > Linked Devices > Link a Device\n');
    }
    
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('WhatsApp connection closed, reconnecting:', shouldReconnect);
      
      if (shouldReconnect) {
        initializeWhatsApp();
      }
    } else if (connection === 'open') {
      console.log('WhatsApp connected successfully!');
    }
  });

  // Handle incoming messages
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    
    for (const msg of messages) {
      if (!msg.message) continue;
      if (msg.key.fromMe) continue; // Ignore messages from ourselves
      
      // Convert WhatsApp message format to our standard format
      const chatId = msg.key.remoteJid;
      const userId = msg.key.participant || msg.key.remoteJid; // Group or DM
      const userMessage = msg.message.conversation || 
                         msg.message.extendedTextMessage?.text || '';
      
      if (!userMessage) continue;
      
      // Extract user info
      const pushName = msg.pushName || 'Unknown';
      const isGroup = chatId.endsWith('@g.us');
      
      // Create a standardized message object
      const standardMsg = {
        chat: {
          id: chatId,
          type: isGroup ? 'group' : 'private'
        },
        from: {
          id: userId.replace('@s.whatsapp.net', '').replace('@g.us', ''),
          first_name: pushName,
          username: pushName.toLowerCase().replace(/\s/g, ''),
          is_bot: false
        },
        text: userMessage,
        reply_to_message: msg.message.extendedTextMessage?.contextInfo ? {
          from: { is_bot: false } // Simplified for now
        } : null
      };
      
      // Handle the message using the same handler as Telegram
      await handleMessage(
        { 
          sendMessage: async (chatId, text) => {
            await sock.sendMessage(chatId, { text });
          },
          sendChatAction: async () => {} // WhatsApp doesn't have typing indicator API
        },
        standardMsg,
        botInfo
      );
    }
  });
}

function stopWhatsApp() {
  if (sock) {
    sock.end();
  }
}

module.exports = {
  initializeWhatsApp,
  stopWhatsApp,
};