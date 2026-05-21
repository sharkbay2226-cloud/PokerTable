export function notifyAdmins(bot, message) {
  const ids = (process.env.ADMIN_IDS || '').split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
  for (const id of ids) {
    bot.api.sendMessage(id, message, { parse_mode: 'HTML' }).catch(() => {});
  }
}
