import { getPromoCode, usePromoCode, createOrder } from '../db.js';

export function promoCommand(bot) {
  bot.command('promo', async (ctx) => {
    const code = ctx.match?.trim();

    if (!code) {
      await ctx.reply('❌ Использование: <code>/promo КОД</code>', { parse_mode: 'HTML' });
      return;
    }

    const promo = getPromoCode(code.toUpperCase());

    if (!promo) {
      await ctx.reply('❌ Промокод не найден.');
      return;
    }

    if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
      await ctx.reply('❌ Промокод истёк.');
      return;
    }

    if (promo.max_uses && promo.used_count >= promo.max_uses) {
      await ctx.reply('❌ Промокод больше не действует (использован максимальное количество раз).');
      return;
    }

    const PRICE_YEARLY = parseFloat(process.env.PRICE_YEARLY || '30');
    const PRICE_LIFETIME = parseFloat(process.env.PRICE_LIFETIME || '100');
    const WALLET = process.env.USDT_WALLET || '';

    const discountYearly = Math.round(PRICE_YEARLY * (100 - promo.discount_percent) / 100);
    const discountLifetime = Math.round(PRICE_LIFETIME * (100 - promo.discount_percent) / 100);

    const msg = [
      `🎉 <b>Промокод <code>${code.toUpperCase()}</code> активирован!</b>`,
      '',
      `Скидка: <b>-${promo.discount_percent}%</b>`,
      '',
      `📅 Годовая: $${PRICE_YEARLY} → <b>$${discountYearly}</b>`,
      `♾️ Бессрочная: $${PRICE_LIFETIME} → <b>$${discountLifetime}</b>`,
      '',
      'Выберите тариф со скидкой:',
    ].join('\n');

    const kb = {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: `📅 Годовая — $${discountYearly}`,
              callback_data: `promo_buy:yearly:${discountYearly}:${code.toUpperCase()}`,
            },
            {
              text: `♾️ Бессрочная — $${discountLifetime}`,
              callback_data: `promo_buy:lifetime:${discountLifetime}:${code.toUpperCase()}`,
            },
          ],
        ],
      },
    };

    await ctx.reply(msg, { parse_mode: 'HTML', ...kb });
  });

  bot.callbackQuery(/^promo_buy:(yearly|lifetime):([\d.]+):(.+)$/, async (ctx) => {
    try {
      const plan = ctx.match[1];
      const amountUsd = parseFloat(ctx.match[2]);
      const code = ctx.match[3];

      const promo = getPromoCode(code);
      if (!promo || (promo.max_uses && promo.used_count >= promo.max_uses)) {
        await ctx.editMessageText('❌ Промокод больше не действует.');
        await ctx.answerCallbackQuery();
        return;
      }

      usePromoCode(code);
      const WALLET = process.env.USDT_WALLET || '';
      const order = createOrder(ctx.from.id, plan, amountUsd, amountUsd, WALLET);
      if (!order) throw new Error('Failed to create order');

      const msg = [
        '✅ <b>Заказ со скидкой создан!</b>',
        '',
        `📋 <b>ID заказа:</b> #${order.id}`,
        `💎 <b>Тариф:</b> ${plan === 'yearly' ? 'Годовая' : 'Бессрочная'}`,
        `💵 <b>Сумма:</b> $${amountUsd} USDT (TRC-20)`,
        `🎫 <b>Промокод:</b> ${code}`,
        `📍 <b>Кошелёк:</b> <code>${WALLET}</code>`,
        '',
        `После оплаты: /confirm ${order.id} TXID`,
      ].join('\n');

      await ctx.editMessageText(msg, { parse_mode: 'HTML', reply_markup: { inline_keyboard: [] } });
      await ctx.answerCallbackQuery();
    } catch (e) {
      await ctx.answerCallbackQuery('❌ Ошибка при создании заказа');
    }
  });
}
