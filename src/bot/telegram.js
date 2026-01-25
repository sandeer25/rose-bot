const TelegramBot = require('node-telegram-bot-api');
const config = require('../config/env');
const { handleMessage } = require('./message-handler');

const bot = new TelegramBot(config.telegram.botToken, { polling: true });

let botInfo = null;

async function initializeBot() {
  botInfo = await bot.getMe();
  console.log(`Bot username: @${botInfo.username}`);
  
  bot.on('message', (msg) => handleMessage(bot, msg, botInfo));
  
  bot.on('polling_error', (error) => {
    console.error('Polling error:', error.message);
  });
}

function stopBot() {
  bot.stopPolling();
}

module.exports = {
  initializeBot,
  stopBot,
};