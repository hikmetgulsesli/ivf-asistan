import betterSqlite3 from 'better-sqlite3';
import { config } from '../config/index.js';

let db: betterSqlite3.Database | null = null;

export function getDb(): betterSqlite3.Database {
  if (!db) {
    if (!config.databaseUrl) {
      throw new Error('DATABASE_URL not configured');
    }
    // For SQLite, we extract the path from the URL
    // Format: sqlite:///path/to/file.db or file path
    const dbPath = config.databaseUrl.replace('sqlite://', '');
    db = new betterSqlite3(dbPath);
    db.pragma('journal_mode = WAL');
    initializeTables(db);
  }
  return db;
}

function initializeTables(database: betterSqlite3.Database): void {
  // Articles table
  database.exec(`
    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title VARCHAR(500) NOT NULL,
      content TEXT NOT NULL,
      category VARCHAR(100) NOT NULL,
      tags TEXT DEFAULT '[]',
      embedding TEXT,
      status VARCHAR(20) DEFAULT 'draft',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // FAQs table
  database.exec(`
    CREATE TABLE IF NOT EXISTS faqs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question VARCHAR(1000) NOT NULL,
      answer TEXT NOT NULL,
      category VARCHAR(100) NOT NULL,
      sort_order INTEGER DEFAULT 0,
      embedding TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Videos table
  database.exec(`
    CREATE TABLE IF NOT EXISTS videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title VARCHAR(500) NOT NULL,
      url VARCHAR(2000) NOT NULL,
      summary TEXT,
      key_topics TEXT DEFAULT '[]',
      timestamps TEXT DEFAULT '[]',
      category VARCHAR(100) NOT NULL,
      duration_seconds INTEGER,
      embedding TEXT,
      analysis_status VARCHAR(20) DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
