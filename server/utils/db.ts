import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdirSync } from 'node:fs'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { sql } from 'drizzle-orm'
import * as schema from '../db/schema'

const dbDir = dirname(fileURLToPath(import.meta.url)).replace(/utils$/, 'db')
mkdirSync(dbDir, { recursive: true })
const dbFile = join(dbDir, 'lar.sqlite')

const sqlite = new Database(dbFile)
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')

export const db = drizzle(sqlite, { schema })

// Idempotent schema creation — keeps the app zero-config (no separate migrate step).
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    hue INTEGER NOT NULL DEFAULT 245,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    cat TEXT NOT NULL,
    sub TEXT NOT NULL DEFAULT '',
    note TEXT NOT NULL DEFAULT '',
    method TEXT NOT NULL DEFAULT '',
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL
  );
`)

export function userCount(): number {
  const row = db.get<{ c: number }>(sql`SELECT COUNT(*) as c FROM users`)
  return row?.c ?? 0
}

export { schema }
