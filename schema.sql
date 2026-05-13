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
  productionUrl TEXT,
  description TEXT,
  environment TEXT,
  accountId TEXT,
  githubUrl TEXT,
  buildingCost REAL DEFAULT 0,
  hostingCost REAL DEFAULT 0,
  licenseCost REAL DEFAULT 0,
  lastUpdated DATETIME DEFAULT CURRENT_TIMESTAMP
);
