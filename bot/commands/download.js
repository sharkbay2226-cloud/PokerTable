export function downloadCommand(bot) {
  bot.command('download', async (ctx) => {
    const msg = [
      '📥 <b>Скачать Poker Diary</b>',
      '',
      'Последняя версия для Windows:',
      `<a href="https://github.com/sharkbay2226-cloud/PokerTable/releases/latest">Poker Diary для Windows (GitHub Releases)</a>`,
      '',
      'Прямая ссылка на EXE:',
      'https://github.com/sharkbay2226-cloud/PokerTable/releases/download/v0.1.0/Poker-Diary-Setup-0.1.0.exe',
    ].join('\n');

    await ctx.reply(msg, { parse_mode: 'HTML', disable_web_page_preview: true });
  });
}
