const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Store DB in /data if that directory exists (Railway persistent volume),
// otherwise store next to server.js
const dataDir = fs.existsSync('/data') ? '/data' : __dirname;
const dbPath = path.join(dataDir, 'expenses.db');

const db = new Database(dbPath);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');

// Create table
db.exec(`
  CREATE TABLE IF NOT EXISTS entries (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    date        TEXT    NOT NULL,          -- YYYY-MM-DD
    description TEXT    NOT NULL,
    category    TEXT    NOT NULL,
    type        TEXT    NOT NULL,          -- 'income' | 'expense'
    amount      REAL    NOT NULL,
    person      TEXT    NOT NULL,          -- 'tariq' | 'nawshin'
    created_at  TEXT    DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_date   ON entries(date);
  CREATE INDEX IF NOT EXISTS idx_person ON entries(person);
  CREATE INDEX IF NOT EXISTS idx_type   ON entries(type);
`);

module.exports = db;
