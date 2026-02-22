import Database from 'better-sqlite3';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const dbPath = process.env.DATABASE_URL?.replace('file:', '') || './data/ivf_asistan.db';
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
  }
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
