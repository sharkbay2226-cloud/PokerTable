import { getReferralStats, getOrCreateUser } from '../db.js';

const REFERRAL_PERCENT = parseInt(process.env.REFERRAL_PERCENT || '20', 10);

export function refCommand(bot) {
  bot.command('ref', async (ctx) => {
    const botInfo = await bot.api.getMe();
    const refLink = `https://t.me/${botInfo.username}?start=${ctx.from.id}`;
    const stats = getReferralStats(ctx.from.id);

    const msg = [
      '👥 <b>Реферальная программа</b>',
      '',
      `🔗 <b>Ваша ссылка:</b>`,
      `<code>${refLink}</code>`,
      '',
      `📊 <b>Статистика:</b>`,
      `   — Всего выплат: ${stats.total}`,
      `   — Ожидают: ${stats.pending}`,
      '',
      `💰 <b>Награда:</b> ${REFERRAL_PERCENT}% от суммы покупки`,
      '',
      `📅 Годовая: вы получаете <b>+${Math.round(30 * REFERRAL_PERCENT / 100 * 365 / 30)} дней</b> продления`,
      `♾️ Бессрочная: <b>$${Math.round(100 * REFERRAL_PERCENT / 100)} USDT</b> на баланс`,
      '',
      'Нажмите на ссылку, чтобы скопировать.',
      'Поделитесь ей с друзьями — получайте награду!',
    ].join('\n');

    await ctx.reply(msg, { parse_mode: 'HTML' });
  });
}
