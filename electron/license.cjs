const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { app } = require('electron');

const STORE_FILE = '.pd-' + crypto.createHash('md5').update('PokerDiary2026').digest('hex').slice(0, 8);
const TRIAL_DAYS = 14;
const GRACE_MS = 7 * 24 * 60 * 60 * 1000;
const REVALIDATE_MS = 24 * 60 * 60 * 1000;
const WORKER_URL = 'https://poker-diary-license.sharkbay2226.workers.dev';

const ED25519_PUBLIC_KEY = Buffer.from('302a300506032b6570032100cbf2db8706ef08b34ebb75c62c45a374e0fc47cf36d4ce203102596af1d84e6b', 'hex');

const STORE_KEY = crypto.createHash('sha256').update('PokerDiaryStore2026' + app.getPath('userData')).digest().slice(0, 32);

function xorEncode(data) {
  const buf = Buffer.from(data, 'utf-8');
  for (let i = 0; i < buf.length; i++) {
    buf[i] ^= STORE_KEY[i % STORE_KEY.length];
  }
  return buf.toString('base64');
}

function xorDecode(encoded) {
  const buf = Buffer.from(encoded, 'base64');
  for (let i = 0; i < buf.length; i++) {
    buf[i] ^= STORE_KEY[i % STORE_KEY.length];
  }
  return buf.toString('utf-8');
}

function storePath() {
  return path.join(app.getPath('userData'), STORE_FILE);
}

function loadStore() {
  try {
    const p = storePath();
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, 'utf-8').trim();
      if (raw) {
        const decrypted = xorDecode(raw);
        const data = JSON.parse(decrypted);
        if (data.fingerprint) return data;
      }
    }
  } catch {}
  return {};
}

function saveStore(s) {
  const data = xorEncode(JSON.stringify(s));
  fs.writeFileSync(storePath(), data, 'utf-8');
}

function getFingerprint() {
  const s = loadStore();
  if (!s.fingerprint) {
    s.fingerprint = crypto.randomUUID();
    saveStore(s);
  }
  return s.fingerprint;
}

function getMachineId() {
  const raw = os.hostname() + '-' + (process.env.USERNAME || os.userInfo().username) + '-' + (process.env.USERDOMAIN || '');
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 32);
}

async function getServerTrialStatus(machineId) {
  try {
    const res = await fetch(WORKER_URL + '/validate-trial', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ machineId }),
      signal: AbortSignal.timeout(3000),
    });
    const data = await res.json();
    if (res.ok && data.valid) {
      return { ok: true, daysLeft: data.daysLeft, trialEnd: data.trialEnd, trialStartedAt: new Date(data.trialStartedAt).getTime(), expired: data.expired };
    }
    if (res.ok && !data.valid && data.reason === 'not_found') {
      return { ok: false, notFound: true };
    }
    return { ok: false };
  } catch {
    return { ok: false };
  }
}

async function startServerTrial(machineId) {
  try {
    const res = await fetch(WORKER_URL + '/trial-start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ machineId }),
      signal: AbortSignal.timeout(3000),
    });
    const data = await res.json();
    if (res.ok) {
      return { ok: true, daysLeft: data.daysLeft, trialEnd: data.trialEnd, trialStartedAt: data.trialStartedAt };
    }
    return { ok: false };
  } catch {
    return { ok: false };
  }
}

async function validateRemote(key, fingerprint) {
  try {
    const res = await fetch(WORKER_URL + '/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, fingerprint }),
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) return { valid: true };
    const data = await res.json().catch(() => ({}));
    return { valid: false, error: data.error || 'Validation failed' };
  } catch (e) {
    return { valid: false, offline: true };
  }
}

async function revalidateIfNeeded() {
  const s = loadStore();
  if (!s.licenseKey || !s.activatedAt) return;

  const now = Date.now();
  if (s.lastValidatedAt && now - s.lastValidatedAt < REVALIDATE_MS) return;

  const fingerprint = s.fingerprint || getFingerprint();
  const result = await validateRemote(s.licenseKey, fingerprint);

  if (result.offline) {
    s.lastValidatedAt = now;
    saveStore(s);
    return;
  }

  if (!result.valid) {
    s.licenseRevokedAt = now;
    s.licenseRevokedReason = result.error;
    delete s.lastValidatedAt;
    saveStore(s);
    return;
  }

  s.lastValidatedAt = now;
  delete s.licenseRevokedAt;
  delete s.licenseRevokedReason;
  saveStore(s);
}

async function getLicenseStatus() {
  revalidateIfNeeded();

  const s = loadStore();
  const now = Date.now();

  if (s.licenseRevokedAt) {
    return { status: 'expired', reason: s.licenseRevokedReason || 'license_revoked' };
  }

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

  // Server-side trial tracking
  const machineId = getMachineId();
  const serverTrial = await getServerTrialStatus(machineId);

  if (serverTrial.ok) {
    if (serverTrial.expired) {
      return { status: 'expired', reason: 'trial_ended' };
    }
    s.serverTrialStartedAt = serverTrial.trialStartedAt;
    saveStore(s);
    return { status: 'trial', daysLeft: serverTrial.daysLeft, trialEnd: serverTrial.trialEnd };
  }

  // Server offline or trial not found — fallback to local cache
  if (!serverTrial.notFound) {
    const localTrialStart = s.serverTrialStartedAt || s.trialStartedAt;
    if (localTrialStart) {
      const trialEnd = localTrialStart + TRIAL_DAYS * 86400000;
      if (now < trialEnd) {
        const daysLeft = Math.ceil((trialEnd - now) / 86400000);
        return { status: 'trial', daysLeft, trialEnd };
      }
      return { status: 'expired', reason: 'trial_ended' };
    }
  }

  // No trial at all — try to start one on server
  if (serverTrial.notFound) {
    const newTrial = await startServerTrial(machineId);
    if (newTrial.ok) {
      s.serverTrialStartedAt = new Date(newTrial.trialStartedAt).getTime();
      saveStore(s);
      return { status: 'trial', daysLeft: newTrial.daysLeft, trialEnd: newTrial.trialEnd };
    }
  }

  // Server completely unavailable — start local trial as last resort
  s.trialStartedAt = now;
  saveStore(s);
  return { status: 'trial', daysLeft: TRIAL_DAYS, trialEnd: now + TRIAL_DAYS * 86400000 };
}

async function activateKey(key) {
  const fingerprint = getFingerprint();

  try {
    const res = await fetch(WORKER_URL + '/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, fingerprint }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: false, error: data.error || 'Activation error (' + res.status + ')' };
    }

    const data = await res.json();
    const s = loadStore();
    s.licenseKey = key;
    s.activatedAt = Date.now();
    s.plan = data.plan;
    s.lastValidatedAt = Date.now();
    if (data.expires_at) s.expiresAt = new Date(data.expires_at).getTime();
    saveStore(s);

    return { success: true, plan: data.plan, expiresAt: data.expires_at };
  } catch (e) {
    if (e.name === 'AbortError') {
      return { success: false, error: 'Server unavailable. Use offline activation.', offline: true };
    }
    return { success: false, error: 'Server unavailable. Use offline activation.', offline: true };
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
    return { success: false, error: 'No pending challenge' };
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
      s.lastValidatedAt = Date.now();
      delete s.pendingChallenge;
      delete s.challengeAt;
      saveStore(s);
      return { success: true, plan: 'lifetime' };
    }

    return { success: false, error: 'Invalid activation code' };
  } catch (e) {
    return { success: false, error: 'Verification error: ' + e.message };
  }
}

function resetLicense() {
  const p = storePath();
  try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch {}
}

module.exports = { getLicenseStatus, activateKey, getOfflineChallenge, verifyOfflineResponse, resetLicense, revalidateIfNeeded };
