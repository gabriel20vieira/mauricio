import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdirSync } from 'node:fs'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { sql } from 'drizzle-orm'
import * as schema from '../db/schema'

// In a built/bundled server (.output) the source path no longer exists, so the
// DB location is configurable via LAR_DB_PATH (set in Docker to a mounted volume).
const dbFile = process.env.LAR_DB_PATH
  || join(dirname(fileURLToPath(import.meta.url)).replace(/utils$/, 'db'), 'lar.sqlite')
mkdirSync(dirname(dbFile), { recursive: true })

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
    active INTEGER NOT NULL DEFAULT 1,
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
  CREATE TABLE IF NOT EXISTS chat_conversations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Nova conversa',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    tool_calls TEXT,
    tool_call_id TEXT,
    tool_name TEXT,
    cards TEXT,
    created_at INTEGER NOT NULL
  );
`)

// Idempotent column additions for databases created before a column existed.
function ensureColumn(table: string, column: string, ddl: string) {
  const cols = sqlite.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]
  if (!cols.some(c => c.name === column)) sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`)
}
ensureColumn('users', 'active', 'active INTEGER NOT NULL DEFAULT 1')

export function userCount(): number {
  const row = db.get<{ c: number }>(sql`SELECT COUNT(*) as c FROM users`)
  return row?.c ?? 0
}

export { schema }
