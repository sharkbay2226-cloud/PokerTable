import { getOrCreateUser, getUserLicenses, getReferralStats } from '../db.js';

export function startCommand(bot) {
  bot.command('start', async (ctx) => {
    const refParam = ctx.match?.trim();
    let referrerId = null;

    if (refParam && /^\d+$/.test(refParam)) {
      referrerId = parseInt(refParam, 10);
    }

    const user = getOrCreateUser(ctx.from, referrerId);
    const licenses = getUserLicenses(ctx.from.id);
    const stats = getReferralStats(ctx.from.id);
    const hasActive = licenses.some((l) => l.status === 'active' && new Date(l.expires_at) > new Date());

    const msg = [
      `👋 <b>${ctx.from.first_name || 'Welcome'}!</b>`,
      '',
      '🤖 <b>Poker Diary Bot</b> — покупка и управление лицензией.',
      '',
      '📥 <b>Скачать приложение:</b>',
      '<a href="http://sharkbqo.beget.tech/Poker-Diary-Setup-0.1.1.exe">Poker Diary Setup 0.1.1</a>',
      '',
      '📋 <b>Команды:</b>',
      '/download — Скачать приложение',
      '/buy — Купить лицензию ($30/year • $100/lifetime)',
      '/confirm TXID — Подтвердить оплату',
      '/activate CODE — Офлайн-активация (подписать код)',
      '/mykey — Статус лицензии',
      '/promo CODE — Применить промокод',
      '/ref — Реферальная ссылка',
      '',
      hasActive ? '✅ У вас есть активная лицензия.' : '💡 Лицензии нет — используйте /buy для покупки.',
    ].join('\n');

    await ctx.reply(msg, { parse_mode: 'HTML' });
  });
}
