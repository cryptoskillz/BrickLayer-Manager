CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS reset_tokens (
  token TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  expires_at DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  email TEXT PRIMARY KEY,
  password TEXT,
  role TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sites (
  id TEXT PRIMARY KEY,
  name TEXT,
  url TEXT,
  previewUrl TEXT,
  description TEXT,
  environment TEXT,
  accountId TEXT,
  githubUrl TEXT,
  cmsUrl TEXT,
  previewCmsUrl TEXT,
  vanityUrl TEXT,
  vanityPreviewUrl TEXT,
  vanityCmsUrl TEXT,
  vanityPreviewCmsUrl TEXT,
  lastUpdated DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS costings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id TEXT NOT NULL,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  is_paid BOOLEAN DEFAULT 0,
  frequency TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

-- Default Currency
INSERT OR IGNORE INTO settings (key, value) VALUES ('currency', 'USD');
