import 'dotenv/config';
import { initDb, getDb, rows, confirmOrder, addLicense } from './db.js';
import { setWalletAddress, getIncomingTransfers } from './trongrid.js';
import { createLicense } from './worker.js';
import { Bot } from 'grammy';

const BOT_TOKEN = process.env.BOT_TOKEN;
const WALLET = process.env.USDT_WALLET;
const POLL_INTERVAL = 60_000;
const MAX_ORDER_AGE_MS = 3 * 3600_000;

const PLAN_NAMES = { monthly: 'Месячная', yearly: 'Годовая', lifetime: 'Бессрочная' };

const ts = () => new Date().toLocaleString('ru-RU');

function generateLicenseKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const parts = [];
  for (let i = 0; i < 4; i++) {
    let part = '';
    for (let j = 0; j < 5; j++) {
      part += chars[Math.floor(Math.random() * chars.length)];
    }
    parts.push(part);
  }
  return parts.join('-');
}

function getUsedTxids(db) {
  const result = db.exec("SELECT DISTINCT txid FROM orders WHERE txid IS NOT NULL");
  const txids = new Set();
  if (result.length && result[0].values) {
    for (const rowData of result[0].values) {
      if (rowData[0]) txids.add(rowData[0]);
    }
  }
  return txids;
}

async function processPendingOrders(bot) {
  const db = getDb();
  const usedTxids = getUsedTxids(db);

  const now = Date.now();
  const minTimestamp = now - MAX_ORDER_AGE_MS;

  const pending = rows(
    "SELECT o.*, u.username, u.first_name FROM orders o LEFT JOIN users u ON o.user_id=u.id WHERE o.status='pending'"
  );

  if (pending.length === 0) return;

  const transfers = await getIncomingTransfers(minTimestamp);
  if (transfers.length === 0) return;

  for (const tx of transfers) {
    if (usedTxids.has(tx.txid)) continue;
    usedTxids.add(tx.txid);

    const order = pending.find(o => Math.abs(o.amount_usdt - tx.value) < 0.5);
    if (!order) continue;

    console.log(`[${ts()}] Match: order #${order.id} -> ${tx.txid} (${tx.value} USDT)`);

    const confirmed = confirmOrder(order.id, tx.txid);
    if (!confirmed) continue;

    const licenseKey = generateLicenseKey();
    const plan = order.plan;
    const expiresAt = plan === 'lifetime'
      ? '2099-12-31T23:59:59Z'
      : plan === 'monthly'
        ? new Date(Date.now() + 30 * 86400000).toISOString()
        : new Date(Date.now() + 366 * 86400000).toISOString();

    try {
      await createLicense(licenseKey, plan, expiresAt);
      addLicense(order.user_id, licenseKey, plan, expiresAt);

      const msg = [
        '✅ <b>Платёж автоматически подтверждён!</b>',
        '',
        `📋 <b>Заказ #${order.id}</b>`,
        `💎 <b>Тариф:</b> ${PLAN_NAMES[plan]}`,
        `💵 <b>Сумма:</b> $${tx.value} USDT`,
        `🔑 <b>Ваш лицензионный ключ:</b>`,
        `<code>${licenseKey}</code>`,
        '',
        '📥 <b>Скачать приложение:</b>',
        '<a href="http://sharkbqo.beget.tech/Poker%20Diary%20Setup%200.1.3.exe">Poker Diary Setup 0.1.3</a>',
        '',
        '📋 Введите ключ в приложении:',
        '   Menu → Ввести ключ → Онлайн-активация',
        '',
        'Спасибо за покупку! ♠',
      ].join('\n');

      await bot.api.sendMessage(order.user_id, msg, { parse_mode: 'HTML' });

      const name = order.first_name || order.username || order.user_id;
      const adminMsg = `🤖 <b>Авто-подтверждение</b>
💰 <b>Заказ #${order.id}</b>
👤 ${name} | @${order.username || '—'}
💎 ${PLAN_NAMES[plan]} | $${tx.value}
🔑 <code>${licenseKey}</code>
📅 ${new Date().toLocaleString('ru-RU')}`;

      const adminIds = (process.env.ADMIN_IDS || '').split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
      for (const id of adminIds) {
        bot.api.sendMessage(id, adminMsg, { parse_mode: 'HTML' }).catch(() => {});
      }
    } catch (e) {
      console.error(`[${ts()}] License creation failed for order #${order.id}: ${e.message}`);
    }
  }
}

async function main() {
  if (!BOT_TOKEN || !WALLET) {
    console.error('Missing BOT_TOKEN or USDT_WALLET in .env');
    process.exit(1);
  }

  await initDb();
  setWalletAddress(WALLET);
  const bot = new Bot(BOT_TOKEN);

  console.log(`[${ts()}] Monitor started, checking every 60s`);

  await processPendingOrders(bot);
  setInterval(() => processPendingOrders(bot), POLL_INTERVAL);
}

main().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
