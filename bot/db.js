import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, 'bot.db');

let db;
let SQL;

function esc(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  return `'${String(val).replace(/'/g, "''")}'`;
}

function fill(sql, params = {}) {
  let idx = 0;
  return sql.replace(/\?/g, () => esc(params[idx++]));
}

function rows(sql, params = {}) {
  const filled = fill(sql, params);
  const result = db.exec(filled);
  if (!result.length) return [];
  const { columns, values } = result[0];
  return values.map((row) =>
    row.reduce((obj, val, i) => { obj[columns[i]] = val; return obj; }, {})
  );
}

export function row(sql, params = {}) {
  return rows(sql + ' LIMIT 1', params)[0] || null;
}

function exec(sql, params = {}) {
  const filled = fill(sql, params);
  db.run(filled);
  saveDb();
  return db.getRowsModified();
}

export async function initDb() {
  SQL = await initSqlJs();
  if (existsSync(DB_PATH)) {
    db = new SQL.Database(readFileSync(DB_PATH));
  } else {
    db = new SQL.Database();
  }

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY, username TEXT, first_name TEXT, last_name TEXT,
    referrer_id INTEGER, created_at TEXT DEFAULT (datetime('now'))
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL,
    plan TEXT NOT NULL CHECK(plan IN ('yearly','lifetime')),
    amount_usd REAL NOT NULL, amount_usdt REAL NOT NULL,
    wallet_address TEXT NOT NULL, txid TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','expired','refunded')),
    license_key TEXT, expires_at TEXT,
    created_at TEXT DEFAULT (datetime('now')), confirmed_at TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS licenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL,
    key TEXT UNIQUE NOT NULL, plan TEXT NOT NULL CHECK(plan IN ('yearly','lifetime')),
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','revoked','expired')),
    expires_at TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now'))
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS promo_codes (
    code TEXT PRIMARY KEY, discount_percent INTEGER NOT NULL,
    max_uses INTEGER, used_count INTEGER DEFAULT 0,
    expires_at TEXT, created_at TEXT DEFAULT (datetime('now'))
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS referrals (
    id INTEGER PRIMARY KEY AUTOINCREMENT, referrer_id INTEGER NOT NULL,
    referee_id INTEGER NOT NULL,
    reward_type TEXT NOT NULL CHECK(reward_type IN ('extension_days','usdt')),
    reward_amount REAL, status TEXT NOT NULL DEFAULT 'pending'
      CHECK(status IN ('pending','paid','cancelled')),
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  saveDb();
  return db;
}

export function getDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

function saveDb() {
  if (db) writeFileSync(DB_PATH, Buffer.from(db.export()));
}

export function getOrCreateUser(telegramUser, referrerId) {
  const existing = row('SELECT * FROM users WHERE id = ?', { 0: telegramUser.id });
  if (existing) {
    exec('UPDATE users SET username=?,first_name=?,last_name=? WHERE id=?', {
      0: telegramUser.username || null, 1: telegramUser.first_name || null,
      2: telegramUser.last_name || null, 3: telegramUser.id,
    });
    return existing;
  }

  let ref = referrerId;
  if (!ref || ref === telegramUser.id || !row('SELECT id FROM users WHERE id = ?', { 0: ref })) {
    ref = null;
  }

  exec('INSERT INTO users (id,username,first_name,last_name,referrer_id) VALUES (?,?,?,?,?)', {
    0: telegramUser.id, 1: telegramUser.username || null,
    2: telegramUser.first_name || null, 3: telegramUser.last_name || null, 4: ref,
  });

  return row('SELECT * FROM users WHERE id = ?', { 0: telegramUser.id });
}

export function createOrder(userId, plan, amountUsd, amountUsdt, walletAddress) {
  exec('INSERT INTO orders (user_id,plan,amount_usd,amount_usdt,wallet_address) VALUES (?,?,?,?,?)', {
    0: userId, 1: plan, 2: amountUsd, 3: amountUsdt, 4: walletAddress,
  });
  const r = db.exec('SELECT MAX(id) as id FROM orders');
  const maxId = r[0]?.values[0]?.[0];
  return maxId ? row('SELECT * FROM orders WHERE id = ?', { 0: maxId }) : null;
}

export function confirmOrder(orderId, txid) {
  exec('UPDATE orders SET status="confirmed",txid=?,confirmed_at=datetime("now") WHERE id=? AND status="pending"', {
    0: txid, 1: orderId,
  });
  return row('SELECT * FROM orders WHERE id = ?', { 0: orderId });
}

export function expirePendingOrders(userId) {
  exec("UPDATE orders SET status='expired' WHERE user_id=? AND status='pending' AND created_at<datetime('now','-2 hours')", {
    0: userId,
  });
}

export function getUserLicenses(userId) {
  return rows('SELECT * FROM licenses WHERE user_id=? ORDER BY created_at DESC', { 0: userId });
}

export function addLicense(userId, key, plan, expiresAt) {
  exec('INSERT INTO licenses (user_id,key,plan,expires_at) VALUES (?,?,?,?)', {
    0: userId, 1: key, 2: plan, 3: expiresAt,
  });
  exec('UPDATE orders SET license_key=?,expires_at=? WHERE user_id=? AND plan=? AND status="confirmed" AND license_key IS NULL', {
    0: key, 1: expiresAt, 2: userId, 3: plan,
  });
}

export function getPromoCode(code) {
  return row('SELECT * FROM promo_codes WHERE code=?', { 0: code });
}

export function usePromoCode(code) {
  exec('UPDATE promo_codes SET used_count=used_count+1 WHERE code=?', { 0: code });
}

export function addReferral(referrerId, refereeId, rewardType, rewardAmount) {
  exec('INSERT INTO referrals (referrer_id,referee_id,reward_type,reward_amount,status) VALUES (?,?,?,?,"pending")', {
    0: referrerId, 1: refereeId, 2: rewardType, 3: rewardAmount,
  });
}

export function getReferralStats(userId) {
  const total = row('SELECT COUNT(*) as c FROM referrals WHERE referrer_id=? AND status="paid"', { 0: userId });
  const pending = row('SELECT COUNT(*) as c FROM referrals WHERE referrer_id=? AND status="pending"', { 0: userId });
  return { total: total?.c || 0, pending: pending?.c || 0 };
}
