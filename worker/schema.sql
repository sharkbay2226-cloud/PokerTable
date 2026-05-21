CREATE TABLE IF NOT EXISTS licenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  plan TEXT NOT NULL CHECK(plan IN ('yearly', 'lifetime')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'revoked', 'refunded')),
  current_fingerprint TEXT,
  activated_at TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_licenses_key ON licenses(key);
CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status);
