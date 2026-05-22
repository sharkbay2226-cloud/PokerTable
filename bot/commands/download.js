export function downloadCommand(bot) {
  bot.command('download', async (ctx) => {
    const msg = [
      '📥 <b>Скачать Poker Diary</b>',
      '',
      'Последняя версия для Windows:',
      '',
      '📦 <b>Хостинг (прямая ссылка):</b>',
      '<a href="http://sharkbqo.beget.tech/Poker%20Diary%20Setup%200.1.3.exe">Poker Diary Setup 0.1.3</a>',
      '',
      '🐙 <b>GitHub Releases:</b>',
      '<a href="https://github.com/sharkbay2226-cloud/PokerTable/releases/latest">github.com/sharkbay2226-cloud/PokerTable/releases</a>',
      '',
      'Размер: ~110 MB',
    ].join('\n');

    await ctx.reply(msg, { parse_mode: 'HTML', disable_web_page_preview: true });
  });
}
