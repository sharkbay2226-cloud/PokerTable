import { createPromoCode, deletePromoCode, getAllPromoCodes, getAllOrders, addLicense } from '../db.js';
import { createLicense } from '../worker.js';

const ADMIN_IDS = (process.env.ADMIN_IDS || '').split(',').map(Number).filter(Boolean);

function isAdmin(ctx) {
  return ADMIN_IDS.includes(ctx.from.id);
}

export function adminCommand(bot) {
  bot.command('addpromo', async (ctx) => {
    if (!isAdmin(ctx)) { await ctx.reply('❌ Нет доступа.'); return; }
    const args = ctx.match?.trim().split(/\s+/);
    if (!args || args.length < 3) {
      await ctx.reply('❌ /addpromo КОД СКИДКА% ЛИМИТ [СРОК]\nПример: /addpromo WELCOME20 20 100 2027-12-31');
      return;
    }
    const code = args[0].toUpperCase();
    const discount = parseInt(args[1], 10);
    const maxUses = parseInt(args[2], 10);
    const expiresAt = args[3] || null;
    createPromoCode(code, discount, maxUses, expiresAt);
    await ctx.reply(`✅ Промокод <code>${code}</code> создан: -${discount}%, ${maxUses} использований${expiresAt ? ', до ' + expiresAt : ''}.`);
  });

  bot.command('delpromo', async (ctx) => {
    if (!isAdmin(ctx)) { await ctx.reply('❌ Нет доступа.'); return; }
    const code = ctx.match?.trim()?.toUpperCase();
    if (!code) { await ctx.reply('❌ /delpromo КОД'); return; }
    deletePromoCode(code);
    await ctx.reply(`✅ Промокод <code>${code}</code> удалён.`);
  });

  bot.command('promos', async (ctx) => {
    if (!isAdmin(ctx)) { await ctx.reply('❌ Нет доступа.'); return; }
    const codes = getAllPromoCodes();
    if (!codes.length) { await ctx.reply('Нет промокодов.'); return; }
    const lines = codes.map(p =>
      `<code>${p.code}</code> — -${p.discount_percent}% | ${p.used_count}/${p.max_uses || '∞'}${p.expires_at ? ' | до ' + p.expires_at.slice(0, 10) : ''}`
    );
    await ctx.reply('🏷️ <b>Промокоды:</b>\n\n' + lines.join('\n'));
  });

  bot.command('orders', async (ctx) => {
    if (!isAdmin(ctx)) { await ctx.reply('❌ Нет доступа.'); return; }
    const orders = getAllOrders();
    if (!orders.length) { await ctx.reply('Нет заказов.'); return; }
    const lines = orders.slice(0, 20).map(o =>
      `#${o.id} | @${o.username || o.user_id} | ${o.plan} | $${o.amount_usdt} | ${o.status}${o.promo_code ? ' | 🎫' + o.promo_code : ''}${o.created_at ? ' | ' + o.created_at.slice(0, 16) : ''}`
    );
    await ctx.reply('📦 <b>Заказы (последние 20):</b>\n\n' + lines.join('\n'));
  });

  bot.command('genkey', async (ctx) => {
    if (!isAdmin(ctx)) { await ctx.reply('❌ Нет доступа.'); return; }
    const args = ctx.match?.trim().split(/\s+/);
    if (!args || args.length < 2) {
      await ctx.reply('❌ /genkey USER_ID PLAN [ДНИ]\nПлан: monthly, yearly, lifetime\nПример: /genkey 858076961 yearly 365');
      return;
    }
    const userId = parseInt(args[0], 10);
    const plan = args[1];
    if (isNaN(userId) || !['monthly', 'yearly', 'lifetime'].includes(plan)) {
      await ctx.reply('❌ Неверные аргументы.');
      return;
    }
    const days = plan === 'lifetime' ? null : parseInt(args[2], 10) || (plan === 'monthly' ? 30 : 365);
    const expiresAt = plan === 'lifetime'
      ? '2099-12-31T23:59:59Z'
      : new Date(Date.now() + days * 86400000).toISOString();

    const key = generateKey();
    try {
      await createLicense(key, plan, expiresAt);
      addLicense(userId, key, plan, expiresAt);
      await ctx.reply(`✅ Ключ создан:\n<code>${key}</code>\n👤 Пользователь: ${userId}\n💎 Тариф: ${plan}\n📅 Истекает: ${expiresAt.slice(0, 10)}`, { parse_mode: 'HTML' });
    } catch (e) {
      await ctx.reply(`❌ Ошибка: ${e.message}`);
    }
  });

  bot.command('revoke', async (ctx) => {
    if (!isAdmin(ctx)) { await ctx.reply('❌ Нет доступа.'); return; }
    const key = ctx.match?.trim();
    if (!key) { await ctx.reply('❌ /revoke КЛЮЧ\nПример: /revoke ABCDE-FGHIJ-KLMNO-PQRST'); return; }
    try {
      await ctx.reply('⏳ Отзываю ключ...');
      const WORKER_URL = process.env.WORKER_URL || 'https://poker-diary-license.sharkbay2226.workers.dev';
      const API_KEY = process.env.WORKER_API_KEY;
      const res = await fetch(WORKER_URL + '/admin/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
        body: JSON.stringify({ key }),
      });
      const data = await res.json();
      await ctx.reply(data.ok ? `✅ Ключ отозван. ${data.message}` : '❌ ' + (data.error || 'Ошибка'));
    } catch (e) {
      await ctx.reply('❌ ' + e.message);
    }
  });
}

function generateKey() {
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
