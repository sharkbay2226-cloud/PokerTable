import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, 'bot.db');

async function main() {
  if (!existsSync(DB_PATH)) {
    console.log('❌ bot.db not found at', DB_PATH);
    process.exit(1);
  }

  const SQL = await initSqlJs();
  const db = new SQL.Database(readFileSync(DB_PATH));

  function query(sql) {
    const result = db.exec(sql);
    if (!result.length) return [];
    const { columns, values } = result[0];
    return values.map(row => row.reduce((o, v, i) => { o[columns[i]] = v; return o; }, {}));
  }

  const orders = query('SELECT o.*, u.username FROM orders o LEFT JOIN users u ON o.user_id=u.id ORDER BY o.created_at DESC LIMIT 100');
  const licenses = query('SELECT * FROM licenses ORDER BY created_at DESC LIMIT 100');
  const promo_codes = query('SELECT * FROM promo_codes ORDER BY created_at DESC');
  const referrals = query('SELECT * FROM referrals ORDER BY created_at DESC LIMIT 100');
  const users = query('SELECT * FROM users ORDER BY created_at DESC LIMIT 100');

  function table(rows, cols) {
    if (!rows.length) return '<p class="empty">Нет данных</p>';
    let h = cols.map(c => `<th>${c.label}</th>`).join('');
    let b = rows.map(r => '<tr>' + cols.map(c => {
      let v = r[c.key];
      if (v === null || v === undefined) v = '—';
      if (c.key === 'amount_usdt') v = `$${v}`;
      if (c.key === 'created_at' || c.key === 'confirmed_at') v = v ? v.slice(0, 19).replace('T', ' ') : '—';
      if (c.key === 'expires_at') v = v ? v.slice(0, 10) : '—';
      if (c.key === 'txid' && v && v.length > 20) v = v.slice(0, 20) + '…';
      if (c.key === 'status' || c.key === 'plan') {
        const colors = { pending: '#f59e0b', confirmed: '#10b981', expired: '#ef4444', active: '#10b981', revoked: '#ef4444', monthly: '#8b5cf6', yearly: '#3b82f6', lifetime: '#ec4899' };
        v = `<span style="background:${colors[v]||'#6b7280'};color:#fff;padding:2px 8px;border-radius:10px;font-size:12px">${v}</span>`;
      }
      if (c.key === 'key') v = `<code>${v}</code>`;
      return `<td>${v}</td>`;
    }).join('') + '</tr>').join('');
    return `<table><thead><tr>${h}</tr></thead><tbody>${b}</tbody></table>`;
  }

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Poker Diary — Отчёт</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f3f4f6; color: #1f2937; padding: 24px; }
  h1 { font-size: 24px; margin-bottom: 4px; }
  .date { color: #6b7280; font-size: 14px; margin-bottom: 24px; }
  h2 { font-size: 18px; margin: 24px 0 12px; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb; }
  table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  th { background: #f9fafb; padding: 10px 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #6b7280; letter-spacing: 0.5px; white-space: nowrap; }
  td { padding: 10px 12px; font-size: 14px; border-top: 1px solid #e5e7eb; }
  tr:hover td { background: #f9fafb; }
  code { background: #e5e7eb; padding: 2px 6px; border-radius: 4px; font-size: 12px; }
  .empty { color: #9ca3af; font-style: italic; padding: 16px; }
  .badge { display: inline-block; }
</style>
</head>
<body>
  <h1>📊 Poker Diary — Отчёт</h1>
  <div class="date">${new Date().toLocaleString('ru-RU')}</div>

  <h2>📦 Заказы (последние 100)</h2>
  ${table(orders, [
    { key: 'id', label: 'ID' },
    { key: 'user_id', label: 'User' },
    { key: 'plan', label: 'Тариф' },
    { key: 'amount_usdt', label: 'Сумма' },
    { key: 'promo_code', label: 'Промо' },
    { key: 'status', label: 'Статус' },
    { key: 'txid', label: 'TXID' },
    { key: 'created_at', label: 'Создан' },
    { key: 'confirmed_at', label: 'Подтверждён' },
  ])}

  <h2>🔑 Лицензии (последние 100)</h2>
  ${table(licenses, [
    { key: 'id', label: 'ID' },
    { key: 'user_id', label: 'User' },
    { key: 'key', label: 'Ключ' },
    { key: 'plan', label: 'Тариф' },
    { key: 'status', label: 'Статус' },
    { key: 'expires_at', label: 'Истекает' },
    { key: 'created_at', label: 'Создана' },
  ])}

  <h2>👥 Пользователи (последние 100)</h2>
  ${table(users, [
    { key: 'id', label: 'ID' },
    { key: 'username', label: 'Username' },
    { key: 'first_name', label: 'Имя' },
    { key: 'referrer_id', label: 'Приглашён' },
    { key: 'created_at', label: 'Дата' },
  ])}

  <h2>🏷️ Промокоды</h2>
  ${table(promo_codes, [
    { key: 'code', label: 'Код' },
    { key: 'discount_percent', label: 'Скидка %' },
    { key: 'max_uses', label: 'Лимит' },
    { key: 'used_count', label: 'Использован' },
    { key: 'expires_at', label: 'Срок' },
  ])}

  <h2>🔗 Рефералы (последние 100)</h2>
  ${table(referrals, [
    { key: 'id', label: 'ID' },
    { key: 'referrer_id', label: 'Реферер' },
    { key: 'referee_id', label: 'Реферал' },
    { key: 'reward_type', label: 'Награда' },
    { key: 'reward_amount', label: 'Сумма' },
    { key: 'status', label: 'Статус' },
    { key: 'created_at', label: 'Дата' },
  ])}

</body>
</html>`;

  const outPath = join(__dirname, 'report.html');
  writeFileSync(outPath, html);
  console.log('✅ Report saved to', outPath);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
