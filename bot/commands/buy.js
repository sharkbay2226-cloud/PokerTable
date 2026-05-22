import { createOrder, expirePendingOrders } from '../db.js';
import { notifyAdmins } from '../notify.js';

const PRICE_MONTHLY = parseFloat(process.env.PRICE_MONTHLY || '5');
const PRICE_YEARLY = parseFloat(process.env.PRICE_YEARLY || '25');
const PRICE_LIFETIME = parseFloat(process.env.PRICE_LIFETIME || '50');
const WALLET = process.env.USDT_WALLET || '';

const PLAN_NAMES = { monthly: 'Месячная', yearly: 'Годовая', lifetime: 'Бессрочная' };

export function buyCommand(bot) {
  bot.command('buy', async (ctx) => {
    if (!WALLET) {
      await ctx.reply('❌ Кошелёк не настроен. Обратитесь к администратору.');
      return;
    }

    expirePendingOrders(ctx.from.id);

    const msg = [
      '💳 <b>Покупка лицензии Poker Diary</b>',
      '',
      'Оплата в <b>USDT (TRC-20)</b> с любого кошелька.',
      '',
      `📆 <b>Месячная</b> — $${PRICE_MONTHLY}`,
      `📅 <b>Годовая</b> — $${PRICE_YEARLY}`,
      `♾️ <b>Бессрочная</b> — $${PRICE_LIFETIME}`,
      '',
      'Выберите тариф:',
    ].join('\n');

    const kb = {
      reply_markup: {
        inline_keyboard: [
          [{ text: `📆 Месячная — $${PRICE_MONTHLY}`, callback_data: `buy:monthly:${PRICE_MONTHLY}` }],
          [{ text: `📅 Годовая — $${PRICE_YEARLY}`, callback_data: `buy:yearly:${PRICE_YEARLY}` }],
          [{ text: `♾️ Бессрочная — $${PRICE_LIFETIME}`, callback_data: `buy:lifetime:${PRICE_LIFETIME}` }],
        ],
      },
    };

    await ctx.reply(msg, { parse_mode: 'HTML', ...kb });
  });

  bot.callbackQuery(/^buy:(monthly|yearly|lifetime):([\d.]+)$/, async (ctx) => {
    try {
      const plan = ctx.match[1];
      const amountUsd = parseFloat(ctx.match[2]);

      const order = createOrder(ctx.from.id, plan, amountUsd, amountUsd, WALLET);
      if (!order) throw new Error('Failed to create order');

      const msg = [
        '✅ <b>Заказ создан!</b>',
        '',
        `📋 <b>ID заказа:</b> #${order.id}`,
        `💎 <b>Тариф:</b> ${PLAN_NAMES[plan]}`,
        `💵 <b>Сумма:</b> $${amountUsd} USDT (TRC-20)`,
        `📍 <b>Кошелёк:</b> <code>${WALLET}</code>`,
        '',
        '🔹 Отправьте USDT (TRC-20) на указанный кошелёк.',
        '🔹 После отправки введите:',
        `<code>/confirm ${order.id} &lt;TXID&gt;</code>`,
        '',
        '⏳ Заказ действителен 2 часа.',
      ].join('\n');

      await ctx.editMessageText(msg, { parse_mode: 'HTML', reply_markup: { inline_keyboard: [] } });
      await ctx.answerCallbackQuery();

      const name = ctx.from.first_name || ctx.from.username || ctx.from.id;
      notifyAdmins(bot, `🆕 <b>Новый заказ #${order.id}</b>
👤 ${name} | @${ctx.from.username || '—'}
💎 ${PLAN_NAMES[plan]} | $${amountUsd}
📅 ${new Date().toLocaleString('ru-RU')}`);
    } catch (e) {
      await ctx.answerCallbackQuery('❌ Ошибка при создании заказа');
    }
  });
}
