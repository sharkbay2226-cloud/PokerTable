export function downloadCommand(bot) {
  bot.command('download', async (ctx) => {
    const msg = [
      '📥 <b>Скачать Poker Diary</b>',
      '',
      'Последняя версия для Windows:',
      '<a href="http://sharkbqo.beget.tech/Poker-Diary-Setup-0.1.1.exe">Poker Diary Setup 0.1.1</a>',
      '',
      'Размер: ~105 MB',
    ].join('\n');

    await ctx.reply(msg, { parse_mode: 'HTML', disable_web_page_preview: true });
  });
}
