import http from 'node:http';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, 'db.json');

const DEFAULT_DATA = { rooms: [], tournaments: [], sessions: [], bankroll: [] };

function readDb() {
  if (!existsSync(DB_PATH)) {
    writeFileSync(DB_PATH, JSON.stringify(DEFAULT_DATA, null, 2));
    return DEFAULT_DATA;
  }
  return JSON.parse(readFileSync(DB_PATH, 'utf-8'));
}

function writeDb(data) {
  writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function parseUrl(url) {
  const [path, qs] = url.split('?');
  const parts = path.replace(/^\/api\//, '').split('/');
  return { path, qs, parts };
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
  });
}

function send(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data));
}

function sendError(res, status, message) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify({ error: message }));
}

const TABLE_MAP = {
  rooms: { keyField: 'id' },
  tournaments: { keyField: 'id' },
  sessions: { keyField: 'id' },
  bankroll: { keyField: 'id' },
};

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const { parts } = parseUrl(req.url);

  // POST /api/seed
  if (req.method === 'POST' && parts[0] === 'seed') {
    const body = await parseBody(req);
    writeDb(body);
    send(res, 200, { ok: true });
    return;
  }

  // POST /api/clear-sessions
  if (req.method === 'POST' && parts[0] === 'clear-sessions') {
    const db = readDb();
    db.sessions = [];
    db.bankroll = [];
    writeDb(db);
    send(res, 200, { ok: true });
    return;
  }

  // GET /api/export
  if (req.method === 'GET' && parts[0] === 'export') {
    const db = readDb();
    send(res, 200, db);
    return;
  }

  // POST /api/import
  if (req.method === 'POST' && parts[0] === 'import') {
    const body = await parseBody(req);
    writeDb(body);
    send(res, 200, { ok: true });
    return;
  }

  // CRUD: /api/:table[/:id]
  const [table, id] = parts;
  const meta = TABLE_MAP[table];

  if (!meta) {
    sendError(res, 404, `Unknown table: ${table}`);
    return;
  }

  const db = readDb();
  const key = meta.keyField;

  try {
    if (req.method === 'GET' && !id) {
      // GET /api/:table
      send(res, 200, db[table]);
    } else if (req.method === 'GET' && id) {
      // GET /api/:table/:id
      const row = db[table].find((r) => String(r[key]) === id);
      if (!row) { sendError(res, 404, 'Not found'); return; }
      send(res, 200, row);
    } else if (req.method === 'POST' && !id) {
      // POST /api/:table
      const body = await parseBody(req);
      if (!body[key]) {
        if (table === 'sessions' || table === 'bankroll') {
          body[key] = db[table].length > 0 ? Math.max(...db[table].map(r => Number(r[key]))) + 1 : 1;
        } else {
          body[key] = crypto.randomUUID();
        }
      }
      db[table].push(body);
      writeDb(db);
      send(res, 201, body);
    } else if (req.method === 'PUT' && id) {
      // PUT /api/:table/:id
      const body = await parseBody(req);
      const idx = db[table].findIndex((r) => String(r[key]) === id);
      if (idx === -1) { sendError(res, 404, 'Not found'); return; }
      db[table][idx] = { ...db[table][idx], ...body };
      writeDb(db);
      send(res, 200, db[table][idx]);
    } else if (req.method === 'DELETE' && id) {
      // DELETE /api/:table/:id
      const idx = db[table].findIndex((r) => String(r[key]) === id);
      if (idx === -1) { sendError(res, 404, 'Not found'); return; }

      // Cascade delete tournaments when deleting a room
      if (table === 'rooms') {
        const roomId = db.rooms[idx][key];
        db.tournaments = db.tournaments.filter((t) => t.roomId !== roomId);
      }

      db[table].splice(idx, 1);
      writeDb(db);
      send(res, 200, { ok: true });
    } else {
      sendError(res, 405, 'Method not allowed');
    }
  } catch (e) {
    sendError(res, 500, e.message);
  }
}

const PORT = process.env.API_PORT || 3001;
http.createServer(handler).listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
