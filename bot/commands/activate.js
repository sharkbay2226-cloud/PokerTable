import { signChallenge } from '../crypto.js';
import { addLicense } from '../db.js';
import { createLicense } from '../worker.js';

export function activateCommand(bot) {
  bot.command('activate', async (ctx) => {
    const challenge = ctx.match?.trim();

    if (!challenge) {
      await ctx.reply(
        '❌ Использование: <code>/activate КОД_ЗАПРОСА</code>\n\n'
        + 'КОД_ЗАПРОСА вы получаете в приложении Poker Diary:\n'
        + '   Ввести ключ → Офлайн-активация → Получить код запроса\n\n'
        + 'Бот подпишет код, и вы сможете активировать приложение офлайн.',
        { parse_mode: 'HTML' }
      );
      return;
    }

    if (challenge.length < 16 || challenge.length > 256) {
      await ctx.reply('❌ Неверный формат кода запроса.');
      return;
    }

    try {
      const signature = signChallenge(challenge);

      const msg = [
        '✅ <b>Код подписан!</b>',
        '',
        '📋 Скопируйте ответ и вставьте в приложение:',
        `<code>${signature}</code>`,
        '',
        '📖 <b>Инструкция:</b>',
        '1. Нажмите кнопку «Проверить и активировать»',
        '2. Если у вас ещё нет лицензии — введите /buy',
      ].join('\n');

      await ctx.reply(msg, { parse_mode: 'HTML' });
    } catch (e) {
      await ctx.reply(`❌ Ошибка подписи: ${e.message}`);
    }
  });
}
