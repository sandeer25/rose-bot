const { Client } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const { handleMessage } = require("./telegram_handler");
const { botInfo } = require("./config");

// Initialize WhatsApp client
const client = new Client();

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
  console.log("Scan this QR code with WhatsApp to log in");
});

client.on("ready", () => {
  console.log("WhatsApp bot ready!");
});

// Function to simulate Telegram's bot object
function createFakeBot(client) {
  return {
    sendMessage: (chatId, text) => client.sendMessage(chatId, text),
    sendChatAction: (chatId, action) => {
      return Promise.resolve();
    },
  };
}

// Handle incoming WhatsApp messages
client.on("message", async (msg) => {
  try {
    const chatId = msg.from;
    const userName = msg._data.notifyName || "Unknown";

    // Fake a Telegram-style message object
    const fakeTelegramMsg = {
      chat: { id: chatId, type: "private" }, // type can be 'group' if needed
      from: {
        id: chatId,
        username: userName,
        first_name: userName,
        is_bot: false,
      },
      text: msg.body,
    };

    // Call your existing Telegram handler
    const fakeBot = createFakeBot(client);
    await handleMessage(fakeBot, fakeTelegramMsg, botInfo);
  } catch (err) {
    console.error("Error handling WhatsApp message:", err);
  }
});

client.initialize();
