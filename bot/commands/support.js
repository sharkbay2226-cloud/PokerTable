import { notifyAdmins } from '../notify.js';

export function supportCommand(bot) {
  bot.command('support', async (ctx) => {
    const text = ctx.match?.trim();

    const header = '📬 <b>Связаться с разработчиком</b>\n\n';

    if (!text) {
      await ctx.reply(
        header
        + 'Опишите вашу проблему после команды, например:\n'
        + '<code>/support Не активируется лицензия</code>\n\n'
        + 'Ваше сообщение будет передано разработчику.',
        { parse_mode: 'HTML' }
      );
      return;
    }

    const name = ctx.from.first_name || ctx.from.username || ctx.from.id;
    const msg = `📬 <b>Сообщение от пользователя</b>\n👤 ${name}\n🆔 ${ctx.from.id}\n📝 ${text}`;

    notifyAdmins(bot, msg);

    await ctx.reply(header + '✅ Ваше сообщение отправлено разработчику. Ожидайте ответа.', { parse_mode: 'HTML' });
  });
}
