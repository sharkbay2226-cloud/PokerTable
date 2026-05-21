import { getUserLicenses } from '../db.js';

export function mykeyCommand(bot) {
  bot.command('mykey', async (ctx) => {
    const licenses = getUserLicenses(ctx.from.id);

    if (licenses.length === 0) {
      await ctx.reply(
        '❌ У вас нет лицензий.\n\n'
        + 'Купить: /buy\n'
        + 'Проверить статус действующей лицензии можно в приложении.'
      );
      return;
    }

    const lines = ['🔑 <b>Ваши лицензии:</b>', ''];
    const now = new Date();

    for (const lic of licenses) {
      const expiresAt = new Date(lic.expires_at);
      const isActive = lic.status === 'active' && expiresAt > now;
      const icon = isActive ? '✅' : '❌';
      const plan = lic.plan === 'lifetime' ? '♾️ Бессрочная' : '📅 Годовая';
      const expires = lic.plan === 'lifetime' ? '—' : expiresAt.toISOString().slice(0, 10);

      lines.push(`${icon} <code>${lic.key}</code>`);
      lines.push(`   ${plan} | До: ${expires}`);
      lines.push('');
    }

    await ctx.reply(lines.join('\n'), { parse_mode: 'HTML' });
  });
}
