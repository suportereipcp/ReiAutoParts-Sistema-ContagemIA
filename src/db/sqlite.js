import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

export function openDatabase(filePath) {
  const db = new Database(filePath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  return db;
}

function runMigrations(db) {
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  const applied = db.pragma('user_version', { simple: true });
  for (let i = applied; i < files.length; i++) {
    const sql = fs.readFileSync(path.join(migrationsDir, files[i]), 'utf8');
    db.exec(sql);
    db.pragma(`user_version = ${i + 1}`);
  }
}

let singleton;
export function getDb(config) {
  if (!singleton) {
    const dir = path.dirname(config.db.path);
    fs.mkdirSync(dir, { recursive: true });
    singleton = openDatabase(config.db.path);
  }
  return singleton;
}
