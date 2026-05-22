import { readFileSync, writeFileSync } from 'node:fs';
import initSqlJs from 'sql.js';

const DB_PATH = '/opt/PokerTable/bot/bot.db';

async function main() {
  const cmd = JSON.parse(readFileSync('/tmp/promo_cmd.json', 'utf8'));
  if (!cmd.action) { console.log('NO_CMD'); process.exit(0); }

  const SQL = await initSqlJs();
  const db = new SQL.Database(readFileSync(DB_PATH));

  let result = '';

  if (cmd.action === 'add') {
    db.run("INSERT OR REPLACE INTO promo_codes VALUES(?,?,?,0,?,datetime('now'))", [
      cmd.code, cmd.discount, cmd.max_uses, cmd.expires || null,
    ]);
    result = `✅ Промокод ${cmd.code} создан (-${cmd.discount}%, ${cmd.max_uses} использований)`;
  } else if (cmd.action === 'delete') {
    db.run('DELETE FROM promo_codes WHERE code=?', [cmd.code]);
    result = `✅ Промокод ${cmd.code} удалён`;
  }

  writeFileSync(DB_PATH, Buffer.from(db.export()));

  const r = db.exec('SELECT * FROM promo_codes ORDER BY created_at DESC');
  const data = r.length ? r[0].values.map(row => row.reduce((o, v, i) => { o[r[0].columns[i]] = v; return o; }, {})) : [];
  writeFileSync('/tmp/promo_data.json', JSON.stringify(data));
  writeFileSync('/tmp/promo_result.json', JSON.stringify({ result, at: new Date().toLocaleString('ru-RU') }));
  writeFileSync('/tmp/empty_cmd.json', '{}');

  console.log(result);
}

main().catch(e => {
  console.error('ERR: ' + e.message);
  writeFileSync('/tmp/promo_result.json', JSON.stringify({ result: '❌ ' + e.message, at: new Date().toLocaleString('ru-RU') }));
});
