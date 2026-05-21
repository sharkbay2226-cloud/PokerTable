const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const STORE_FILE = 'license-store.json';
const TRIAL_DAYS = 14;
const GRACE_MS = 7 * 24 * 60 * 60 * 1000;
const WORKER_URL = 'https://poker-diary-license.sharkbay2226.workers.dev';

const ED25519_PUBLIC_KEY = Buffer.from('302a300506032b6570032100cbf2db8706ef08b34ebb75c62c45a374e0fc47cf36d4ce203102596af1d84e6b', 'hex');

function storePath() {
  return path.join(app.getPath('userData'), STORE_FILE);
}

function loadStore() {
  try {
    const p = storePath();
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, 'utf-8'));
    }
  } catch {}
  return {};
}

function saveStore(s) {
  fs.writeFileSync(storePath(), JSON.stringify(s, null, 2));
}

function getFingerprint() {
  const s = loadStore();
  if (!s.fingerprint) {
    s.fingerprint = crypto.randomUUID();
    saveStore(s);
  }
  return s.fingerprint;
}

function getLicenseStatus() {
  const s = loadStore();
  const now = Date.now();

  if (s.licenseKey && s.activatedAt) {
    if (s.plan === 'lifetime') {
      return { status: 'licensed', plan: 'lifetime', activatedAt: s.activatedAt };
    }
    if (s.plan === 'yearly' && s.expiresAt > now) {
      return { status: 'licensed', plan: 'yearly', expiresAt: s.expiresAt };
    }
    if (s.plan === 'yearly') {
      if (now - s.expiresAt < GRACE_MS) {
        return { status: 'grace', expiresAt: s.expiresAt };
      }
      return { status: 'expired', reason: 'license_expired' };
    }
  }

  if (s.trialStartedAt) {
    const trialEnd = s.trialStartedAt + TRIAL_DAYS * 86400000;
    if (now < trialEnd) {
      const daysLeft = Math.ceil((trialEnd - now) / 86400000);
      return { status: 'trial', daysLeft, trialEnd };
    }
    return { status: 'expired', reason: 'trial_ended' };
  }

  s.trialStartedAt = now;
  saveStore(s);
  return { status: 'trial', daysLeft: TRIAL_DAYS, trialEnd: now + TRIAL_DAYS * 86400000 };
}

async function activateKey(key) {
  const fingerprint = getFingerprint();

  try {
    const res = await fetch(`${WORKER_URL}/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, fingerprint }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: false, error: data.error || 'Ошибка активации (код ' + res.status + ')' };
    }

    const data = await res.json();
    const s = loadStore();
    s.licenseKey = key;
    s.activatedAt = Date.now();
    s.plan = data.plan;
    if (data.expires_at) s.expiresAt = new Date(data.expires_at).getTime();
    saveStore(s);

    return { success: true, plan: data.plan, expiresAt: data.expires_at };
  } catch (e) {
    if (e.name === 'AbortError') {
      return { success: false, error: 'Сервер недоступен. Используйте офлайн-активацию.', offline: true };
    }
    return { success: false, error: 'Сервер недоступен. Используйте офлайн-активацию.', offline: true };
  }
}

function getOfflineChallenge() {
  const s = loadStore();
  const challenge = crypto.randomBytes(32).toString('hex');
  s.pendingChallenge = challenge;
  s.challengeAt = Date.now();
  saveStore(s);
  return challenge;
}

function verifyOfflineResponse(response) {
  const s = loadStore();
  if (!s.pendingChallenge) {
    return { success: false, error: 'Нет ожидающего запроса' };
  }

  try {
    const ok = crypto.verify(
      null,
      Buffer.from(s.pendingChallenge, 'utf-8'),
      ED25519_PUBLIC_KEY,
      Buffer.from(response, 'hex')
    );

    if (ok) {
      s.licenseKey = 'offline-' + crypto.randomUUID().slice(0, 8);
      s.activatedAt = Date.now();
      s.plan = 'lifetime';
      delete s.pendingChallenge;
      delete s.challengeAt;
      saveStore(s);
      return { success: true, plan: 'lifetime' };
    }

    return { success: false, error: 'Неверный код активации' };
  } catch (e) {
    return { success: false, error: 'Ошибка проверки: ' + e.message };
  }
}

function resetLicense() {
  const p = storePath();
  try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch {}
}

module.exports = { getLicenseStatus, activateKey, getOfflineChallenge, verifyOfflineResponse, resetLicense };
