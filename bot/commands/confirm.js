import { confirmOrder, addLicense, row } from '../db.js';
import { createLicense } from '../worker.js';
import { verifyTransaction } from '../trongrid.js';

export function confirmCommand(bot) {
  bot.command('confirm', async (ctx) => {
    const args = ctx.match?.trim().split(/\s+/);
    if (!args || args.length < 2) {
      await ctx.reply(
        '❌ Использование: <code>/confirm ID_ЗАКАЗА TXID</code>\n\nПример: <code>/confirm 5 8a4f3e7b1c2d...</code>',
        { parse_mode: 'HTML' }
      );
      return;
    }

    const orderId = parseInt(args[0], 10);
    const txid = args[1].replace(/^0x/i, '');

    if (isNaN(orderId)) {
      await ctx.reply('❌ Неверный ID заказа.');
      return;
    }

    const order = row(
      'SELECT * FROM orders WHERE id = ? AND user_id = ? AND status = "pending"',
      { 0: orderId, 1: ctx.from.id }
    );

    if (!order) {
      await ctx.reply('❌ Заказ не найден или уже обработан.');
      return;
    }

    await ctx.reply('🔄 Проверяю транзакцию...');

    const result = await verifyTransaction(txid, order.amount_usdt);

    if (!result.valid) {
      const reasons = {
        'transaction_not_found': 'Транзакция не найдена. Проверьте TXID.',
        'no_events': 'В транзакции нет событий.',
        'no_matching_transfer': 'Не найден перевод USDT на нужную сумму.',
      };
      await ctx.reply(`❌ ${reasons[result.reason] || result.reason}`);
      return;
    }

    const confirmed = confirmOrder(orderId, txid);
    if (!confirmed) {
      await ctx.reply('❌ Не удалось подтвердить заказ.');
      return;
    }

    const licenseKey = generateLicenseKey();
    const plan = order.plan;
    const expiresAt = plan === 'lifetime'
      ? '2099-12-31T23:59:59Z'
      : new Date(Date.now() + 366 * 86400000).toISOString();

    try {
      await createLicense(licenseKey, plan, expiresAt);
      addLicense(ctx.from.id, licenseKey, plan, expiresAt);

      await ctx.reply(
        [
          '✅ <b>Платёж подтверждён!</b>',
          '',
          `🔑 <b>Ваш лицензионный ключ:</b>`,
          `<code>${licenseKey}</code>`,
          '',
          `📅 <b>Тариф:</b> ${plan === 'yearly' ? 'Годовая (до ' + expiresAt.slice(0, 10) + ')' : 'Бессрочная'}`,
          '',
          '📥 <b>Скачать приложение:</b>',
          '<a href="https://github.com/sharkbay2226-cloud/PokerTable/releases/latest">Poker Diary для Windows</a>',
          '',
          '📋 Введите ключ в приложении:',
          '   Menu → Ввести ключ → Онлайн-активация',
          '',
          'Спасибо за покупку! ♠',
        ].join('\n'),
        { parse_mode: 'HTML' }
      );
    } catch (e) {
      await ctx.reply(`❌ Ошибка создания лицензии: ${e.message}. Обратитесь к администратору.`);
    }
  });
}

function generateLicenseKey() {
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
