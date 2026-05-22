const MAX_ACTIVATIONS = 3;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;
    await ensureTables(env);

    if (method === 'GET' && url.pathname === '/health') {
      return json({ ok: true }, 200);
    }
    if (method === 'POST' && url.pathname === '/validate') {
      return handleValidate(request, env);
    }
    if (method === 'POST' && url.pathname === '/activate') {
      return handleActivate(request, env);
    }
    if (method === 'POST' && url.pathname === '/create-license') {
      return handleCreateLicense(request, env);
    }
    if (method === 'POST' && url.pathname === '/admin/revoke') {
      return handleAdminRevoke(request, env);
    }
    return json({ error: 'Not found' }, 404);
  },
};

async function ensureTables(env) {
  try {
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS activations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      license_key TEXT NOT NULL,
      fingerprint TEXT NOT NULL,
      activated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(license_key, fingerprint)
    )`).run();
  } catch (e) {
    console.error('Migration: ' + e.message);
  }
}

async function getLicense(env, key) {
  return env.DB.prepare('SELECT * FROM licenses WHERE key = ?').bind(key).first();
}

function checkLicenseError(license) {
  if (!license) return { error: 'License key not found', status: 404 };
  if (license.status !== 'active') return { error: 'License is ' + license.status, status: 403 };
  if (Date.now() > new Date(license.expires_at).getTime()) return { error: 'License expired', status: 403 };
  return null;
}

async function getActivationCount(env, key) {
  const row = await env.DB.prepare(
    'SELECT COUNT(*) as count FROM activations WHERE license_key = ?'
  ).bind(key).first();
  return row ? row.count : 0;
}

async function isActivated(env, key, fingerprint) {
  const row = await env.DB.prepare(
    'SELECT id FROM activations WHERE license_key = ? AND fingerprint = ?'
  ).bind(key, fingerprint).first();
  return !!row;
}

async function handleValidate(request, env) {
  const { key, fingerprint } = await request.json().catch(() => ({}));
  if (!key || !fingerprint) return json({ error: 'Missing key or fingerprint' }, 400);

  const license = await getLicense(env, key);
  const err = checkLicenseError(license);
  if (err) return json({ error: err.error }, err.status);

  const activated = await isActivated(env, key, fingerprint);
  const activationCount = await getActivationCount(env, key);

  return json({
    valid: true,
    plan: license.plan,
    expires_at: license.expires_at,
    activated: activated || !!license.current_fingerprint,
    activation_count: activationCount,
    max_activations: MAX_ACTIVATIONS,
  }, 200);
}

async function handleActivate(request, env) {
  const { key, fingerprint } = await request.json().catch(() => ({}));
  if (!key || !fingerprint) return json({ error: 'Missing key or fingerprint' }, 400);

  const license = await getLicense(env, key);
  const err = checkLicenseError(license);
  if (err) return json({ error: err.error }, err.status);

  // Already activated on this device — allow
  if (await isActivated(env, key, fingerprint)) {
    return json({ plan: license.plan, expires_at: license.expires_at }, 200);
  }

  // Check limit
  let count = await getActivationCount(env, key);

  // Migrate old current_fingerprint if first activation ever
  if (count === 0 && license.current_fingerprint) {
    await env.DB.prepare(
      'INSERT OR IGNORE INTO activations (license_key, fingerprint) VALUES (?, ?)'
    ).bind(key, license.current_fingerprint).run();
    count = await getActivationCount(env, key);
  }

  if (count >= MAX_ACTIVATIONS) {
    return json({ error: 'Max activations (' + MAX_ACTIVATIONS + ') reached' }, 403);
  }

  await env.DB.prepare(
    'INSERT INTO activations (license_key, fingerprint) VALUES (?, ?)'
  ).bind(key, fingerprint).run();

  // Backward compat
  await env.DB.prepare(
    'UPDATE licenses SET current_fingerprint = ?, activated_at = ? WHERE key = ?'
  ).bind(fingerprint, new Date().toISOString(), key).run();

  return json({ plan: license.plan, expires_at: license.expires_at }, 200);
}

async function handleCreateLicense(request, env) {
  const auth = request.headers.get('X-API-Key');
  if (auth !== env.API_KEY) return json({ error: 'Unauthorized' }, 401);

  const { key, plan, expires_at } = await request.json().catch(() => ({}));
  if (!key || !plan || !expires_at) return json({ error: 'Missing key, plan or expires_at' }, 400);
  if (!['monthly', 'yearly', 'lifetime'].includes(plan)) return json({ error: 'Invalid plan' }, 400);

  try {
    await env.DB.prepare('INSERT INTO licenses (key, plan, expires_at) VALUES (?, ?, ?)').bind(key, plan, expires_at).run();
    return json({ ok: true }, 201);
  } catch (e) {
    if (e.message?.includes('UNIQUE')) return json({ error: 'License key already exists' }, 409);
    return json({ error: e.message }, 500);
  }
}

async function handleAdminRevoke(request, env) {
  const auth = request.headers.get('X-API-Key');
  if (auth !== env.API_KEY) return json({ error: 'Unauthorized' }, 401);

  const { key, fingerprint } = await request.json().catch(() => ({}));
  if (!key) return json({ error: 'Missing key' }, 400);

  if (fingerprint) {
    await env.DB.prepare('DELETE FROM activations WHERE license_key = ? AND fingerprint = ?').bind(key, fingerprint).run();
    return json({ ok: true, message: 'Device deactivated' }, 200);
  }

  await env.DB.prepare('DELETE FROM activations WHERE license_key = ?').bind(key).run();
  await env.DB.prepare('UPDATE licenses SET current_fingerprint = NULL WHERE key = ?').bind(key).run();
  return json({ ok: true, message: 'All activations cleared' }, 200);
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
