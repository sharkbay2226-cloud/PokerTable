import 'dotenv/config';
import { Bot } from 'grammy';
import { initDb } from './db.js';
import { setWalletAddress } from './trongrid.js';
import { startCommand } from './commands/start.js';
import { buyCommand } from './commands/buy.js';
import { confirmCommand } from './commands/confirm.js';
import { activateCommand } from './commands/activate.js';
import { mykeyCommand } from './commands/mykey.js';
import { promoCommand } from './commands/promo.js';
import { refCommand } from './commands/ref.js';
import { downloadCommand } from './commands/download.js';

async function main() {
  const BOT_TOKEN = process.env.BOT_TOKEN;

  if (!BOT_TOKEN) {
    console.error('❌ BOT_TOKEN not set');
    process.exit(1);
  }

  await initDb();
  console.log('✅ Database initialized');

  if (process.env.USDT_WALLET) {
    const ok = setWalletAddress(process.env.USDT_WALLET);
    if (ok) {
      console.log(`✅ USDT wallet configured: ${process.env.USDT_WALLET}`);
    } else {
      console.warn('⚠️ Invalid USDT wallet address');
    }
  }

  const bot = new Bot(BOT_TOKEN);

  startCommand(bot);
  buyCommand(bot);
  confirmCommand(bot);
  activateCommand(bot);
  mykeyCommand(bot);
  promoCommand(bot);
  refCommand(bot);
  downloadCommand(bot);

  await bot.api.setMyCommands([
    { command: 'start', description: 'Main menu' },
    { command: 'buy', description: 'Buy Poker Diary license' },
    { command: 'confirm', description: 'Confirm payment by TXID' },
    { command: 'activate', description: 'Offline activation (sign a code)' },
    { command: 'mykey', description: 'Show my license key' },
    { command: 'promo', description: 'Activate promo code' },
    { command: 'ref', description: 'Referral program' },
    { command: 'download', description: 'Download Poker Diary app' },
  ]);
  await bot.api.setMyCommands([
    { command: 'start', description: 'Главное меню' },
    { command: 'buy', description: 'Купить лицензию Poker Diary' },
    { command: 'confirm', description: 'Подтвердить оплату по TXID' },
    { command: 'activate', description: 'Привязать лицензию к приложению' },
    { command: 'mykey', description: 'Показать мой лицензионный ключ' },
    { command: 'promo', description: 'Активировать промокод' },
    { command: 'ref', description: 'Реферальная программа' },
    { command: 'download', description: 'Скачать приложение Poker Diary' },
  ], { language_code: 'ru' });
  console.log('✅ Commands registered');

  bot.catch((err) => {
    console.error('❌ Bot error:', err);
  });

  bot.start({
    onStart: () => console.log('🤖 Poker Diary Bot started (polling)'),
  });
}

main().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
