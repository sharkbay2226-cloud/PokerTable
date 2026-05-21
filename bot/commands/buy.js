import { createOrder, expirePendingOrders } from '../db.js';

const PRICE_YEARLY = parseFloat(process.env.PRICE_YEARLY || '30');
const PRICE_LIFETIME = parseFloat(process.env.PRICE_LIFETIME || '100');
const WALLET = process.env.USDT_WALLET || '';

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
      `📅 <b>Годовая</b> — $${PRICE_YEARLY}`,
      `♾️ <b>Бессрочная</b> — $${PRICE_LIFETIME}`,
      '',
      'Выберите тариф:',
    ].join('\n');

    const kb = {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: `📅 Годовая — $${PRICE_YEARLY}`,
              callback_data: `buy:yearly:${PRICE_YEARLY}`,
            },
            {
              text: `♾️ Бессрочная — $${PRICE_LIFETIME}`,
              callback_data: `buy:lifetime:${PRICE_LIFETIME}`,
            },
          ],
        ],
      },
    };

    await ctx.reply(msg, { parse_mode: 'HTML', ...kb });
  });

  bot.callbackQuery(/^buy:(yearly|lifetime):([\d.]+)$/, async (ctx) => {
    try {
      const plan = ctx.match[1];
      const amountUsd = parseFloat(ctx.match[2]);

      const order = createOrder(ctx.from.id, plan, amountUsd, amountUsd, WALLET);
      if (!order) throw new Error('Failed to create order');

      const msg = [
        '✅ <b>Заказ создан!</b>',
        '',
        `📋 <b>ID заказа:</b> #${order.id}`,
        `💎 <b>Тариф:</b> ${plan === 'yearly' ? 'Годовая' : 'Бессрочная'}`,
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
    } catch (e) {
      await ctx.answerCallbackQuery('❌ Ошибка при создании заказа');
    }
  });
}
