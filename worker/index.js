const API_KEY = '';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;

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

    return json({ error: 'Not found' }, 404);
  },
};

async function handleValidate(request, env) {
  const { key, fingerprint } = await request.json().catch(() => ({}));

  if (!key || !fingerprint) {
    return json({ error: 'Missing key or fingerprint' }, 400);
  }

  const license = await env.DB.prepare(
    'SELECT * FROM licenses WHERE key = ?'
  ).bind(key).first();

  if (!license) {
    return json({ error: 'License key not found' }, 404);
  }

  if (license.status !== 'active') {
    return json({ error: 'License is ' + license.status }, 403);
  }

  const now = Date.now();
  const expiresAt = new Date(license.expires_at).getTime();

  if (now > expiresAt) {
    return json({ error: 'License expired' }, 403);
  }

  if (license.current_fingerprint && license.current_fingerprint !== fingerprint) {
    return json({ error: 'License already activated on another device' }, 403);
  }

  return json({
    valid: true,
    plan: license.plan,
    expires_at: license.expires_at,
    activated: !!license.current_fingerprint,
  }, 200);
}

async function handleActivate(request, env) {
  const { key, fingerprint } = await request.json().catch(() => ({}));

  if (!key || !fingerprint) {
    return json({ error: 'Missing key or fingerprint' }, 400);
  }

  const license = await env.DB.prepare(
    'SELECT * FROM licenses WHERE key = ?'
  ).bind(key).first();

  if (!license) {
    return json({ error: 'License key not found' }, 404);
  }

  if (license.status !== 'active') {
    return json({ error: 'License is ' + license.status }, 403);
  }

  const now = Date.now();
  const expiresAt = new Date(license.expires_at).getTime();

  if (now > expiresAt) {
    return json({ error: 'License expired' }, 403);
  }

  const existingFingerprint = license.current_fingerprint;

  if (existingFingerprint && existingFingerprint !== fingerprint) {
    await env.DB.prepare(
      'UPDATE licenses SET current_fingerprint = ?, activated_at = ? WHERE key = ?'
    ).bind(fingerprint, new Date().toISOString(), key).run();

    return json({
      plan: license.plan,
      expires_at: license.expires_at,
      transferred: true,
    }, 200);
  }

  await env.DB.prepare(
    'UPDATE licenses SET current_fingerprint = ?, activated_at = ? WHERE key = ?'
  ).bind(fingerprint, new Date().toISOString(), key).run();

  return json({
    plan: license.plan,
    expires_at: license.expires_at,
    transferred: false,
  }, 200);
}

async function handleCreateLicense(request, env) {
  const auth = request.headers.get('X-API-Key');
  if (auth !== API_KEY && env.API_KEY && auth !== env.API_KEY) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const { key, plan, expires_at } = await request.json().catch(() => ({}));

  if (!key || !plan || !expires_at) {
    return json({ error: 'Missing key, plan or expires_at' }, 400);
  }

  if (!['yearly', 'lifetime'].includes(plan)) {
    return json({ error: 'Invalid plan' }, 400);
  }

  try {
    await env.DB.prepare(
      'INSERT INTO licenses (key, plan, expires_at) VALUES (?, ?, ?)'
    ).bind(key, plan, expires_at).run();

    return json({ ok: true }, 201);
  } catch (e) {
    if (e.message?.includes('UNIQUE constraint')) {
      return json({ error: 'License key already exists' }, 409);
    }
    return json({ error: e.message }, 500);
  }
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
