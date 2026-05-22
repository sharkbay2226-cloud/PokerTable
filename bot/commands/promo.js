import { getPromoCode, usePromoCode, createOrder } from '../db.js';

const PLAN_NAMES = { monthly: 'Месячная', yearly: 'Годовая', lifetime: 'Бессрочная' };

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

    const PRICES = {
      monthly: parseFloat(process.env.PRICE_MONTHLY || '5'),
      yearly: parseFloat(process.env.PRICE_YEARLY || '25'),
      lifetime: parseFloat(process.env.PRICE_LIFETIME || '50'),
    };
    const WALLET = process.env.USDT_WALLET || '';

    const discounted = {};
    for (const [k, v] of Object.entries(PRICES)) {
      discounted[k] = Math.round(v * (100 - promo.discount_percent) / 100);
    }

    const lines = [`🎉 <b>Промокод <code>${code.toUpperCase()}</code> активирован!</b>`, '', `Скидка: <b>-${promo.discount_percent}%</b>`, ''];
    for (const [k, v] of Object.entries(PRICES)) {
      lines.push(`${k === 'monthly' ? '📆' : k === 'yearly' ? '📅' : '♾️'} ${PLAN_NAMES[k]}: $${v} → <b>$${discounted[k]}</b>`);
    }
    lines.push('', 'Выберите тариф со скидкой:');

    const kb = {
      reply_markup: {
        inline_keyboard: Object.entries(discounted).map(([plan, price]) => [{
          text: `${plan === 'monthly' ? '📆' : plan === 'yearly' ? '📅' : '♾️'} ${PLAN_NAMES[plan]} — $${price}`,
          callback_data: `promo_buy:${plan}:${price}:${code.toUpperCase()}`,
        }]),
      },
    };

    await ctx.reply(lines.join('\n'), { parse_mode: 'HTML', ...kb });
  });

  bot.callbackQuery(/^promo_buy:(monthly|yearly|lifetime):([\d.]+):(.+)$/, async (ctx) => {
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
      const order = createOrder(ctx.from.id, plan, amountUsd, amountUsd, WALLET, code);
      if (!order) throw new Error('Failed to create order');

      const msg = [
        '✅ <b>Заказ со скидкой создан!</b>',
        '',
        `📋 <b>ID заказа:</b> #${order.id}`,
        `💎 <b>Тариф:</b> ${PLAN_NAMES[plan]}`,
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
