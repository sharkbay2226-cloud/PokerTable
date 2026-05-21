const WORKER_URL = process.env.WORKER_URL || 'https://poker-diary-license.sharkbay2226.workers.dev';
const API_KEY = process.env.WORKER_API_KEY;

export async function createLicense(key, plan, expiresAt) {
  const res = await fetch(`${WORKER_URL}/create-license`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify({ key, plan, expires_at: expiresAt }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create license');
  return data;
}

export async function getLicenseStatus(key) {
  const res = await fetch(`${WORKER_URL}/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, fingerprint: 'bot-check' }),
  });
  const data = await res.json();
  if (!res.ok) return null;
  return data;
}
