import mysql from 'mysql2/promise'
import { drizzle } from 'drizzle-orm/mysql2'
import { sql } from 'drizzle-orm'
import * as schema from '../db/schema'
import { seedCategoriesIfEmpty } from './seedCategories'

// MySQL connection pool. Configurable via env (set in docker compose / .env).
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || 'mauricio',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'mauricio',
  charset: 'utf8mb4',
  connectionLimit: 10,
})

export const db = drizzle(pool, { schema, mode: 'default' })
export { schema, pool }

// Idempotent schema creation — keeps the app zero-config (no separate migrate step).
// One statement per query (multipleStatements is off by default).
const DDL = [
  `CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(16) NOT NULL DEFAULT 'user',
    hue INT NOT NULL DEFAULT 245,
    active TINYINT(1) NOT NULL DEFAULT 1,
    locale VARCHAR(16) NULL,
    created_at BIGINT NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS settings (
    \`key\` VARCHAR(191) PRIMARY KEY,
    value TEXT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(64) PRIMARY KEY,
    hue INT NOT NULL DEFAULT 200,
    sort INT NOT NULL DEFAULT 0,
    active TINYINT(1) NOT NULL DEFAULT 1,
    name_en VARCHAR(255) NOT NULL DEFAULT '',
    name_pt VARCHAR(255) NOT NULL DEFAULT '',
    name_es VARCHAR(255) NOT NULL DEFAULT '',
    description VARCHAR(255) NOT NULL DEFAULT ''
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS subcategories (
    id VARCHAR(64) PRIMARY KEY,
    category_id VARCHAR(64) NOT NULL,
    sort INT NOT NULL DEFAULT 0,
    active TINYINT(1) NOT NULL DEFAULT 1,
    name_en VARCHAR(255) NOT NULL DEFAULT '',
    name_pt VARCHAR(255) NOT NULL DEFAULT '',
    name_es VARCHAR(255) NOT NULL DEFAULT '',
    description VARCHAR(255) NOT NULL DEFAULT '',
    CONSTRAINT fk_sub_cat FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS expenses (
    id VARCHAR(36) PRIMARY KEY,
    date VARCHAR(10) NOT NULL,
    amount_cents INT NOT NULL,
    cat VARCHAR(64) NOT NULL,
    sub VARCHAR(64) NOT NULL DEFAULT '',
    note VARCHAR(500) NOT NULL DEFAULT '',
    method VARCHAR(64) NOT NULL DEFAULT '',
    user_id VARCHAR(36) NOT NULL,
    created_at BIGINT NOT NULL,
    CONSTRAINT fk_exp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    user_agent VARCHAR(300) NOT NULL DEFAULT '',
    ip VARCHAR(64) NOT NULL DEFAULT '',
    created_at BIGINT NOT NULL,
    last_seen_at BIGINT NOT NULL,
    revoked_at BIGINT NULL,
    CONSTRAINT fk_sess_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS chat_conversations (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL DEFAULT 'Nova conversa',
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    CONSTRAINT fk_conv_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS chat_messages (
    id VARCHAR(36) PRIMARY KEY,
    conversation_id VARCHAR(36) NOT NULL,
    role VARCHAR(16) NOT NULL,
    content TEXT NOT NULL,
    tool_calls TEXT NULL,
    tool_call_id VARCHAR(64) NULL,
    tool_name VARCHAR(64) NULL,
    cards TEXT NULL,
    segments TEXT NULL,
    created_at BIGINT NOT NULL,
    CONSTRAINT fk_msg_conv FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
]

// Idempotent column additions for databases created before a column existed.
async function ensureColumn(table: string, column: string, ddl: string) {
  const [rows] = await pool.query(
    'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
    [table, column],
  )
  if ((rows as any[]).length === 0) await pool.query(`ALTER TABLE ${table} ADD COLUMN ${ddl}`)
}

let initPromise: Promise<void> | null = null

// Run once at startup (awaited by a Nitro plugin). Creates tables, patches columns,
// seeds default categories.
export function initDb(): Promise<void> {
  if (!initPromise) initPromise = doInit()
  return initPromise
}

async function doInit() {
  // Wait for MySQL to accept connections (container may still be starting).
  for (let attempt = 1; ; attempt++) {
    try { await pool.query('SELECT 1'); break }
    catch (err) {
      if (attempt >= 30) throw err
      await new Promise(r => setTimeout(r, 1000))
    }
  }
  for (const stmt of DDL) await pool.query(stmt)
  await ensureColumn('users', 'active', 'active TINYINT(1) NOT NULL DEFAULT 1')
  await ensureColumn('users', 'locale', 'locale VARCHAR(16) NULL')
  await ensureColumn('chat_messages', 'segments', 'segments TEXT NULL')
  await ensureColumn('categories', 'description', "description VARCHAR(255) NOT NULL DEFAULT ''")
  await ensureColumn('subcategories', 'description', "description VARCHAR(255) NOT NULL DEFAULT ''")
  await seedCategoriesIfEmpty(db)
}

export async function userCount(): Promise<number> {
  const row = await db.select({ c: sql<number>`COUNT(*)` }).from(schema.users)
  return Number(row[0]?.c ?? 0)
}
