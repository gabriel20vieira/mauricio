import { mysqlTable, varchar, int, bigint, boolean, text } from 'drizzle-orm/mysql-core'

// Note: timestamps are epoch-millis (Date.now()) → bigint, not int (int overflows).
// ids are uuids → varchar(36). Short labels are varchar; long content is text.

export const users = mysqlTable('users', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: varchar('role', { length: 16, enum: ['admin', 'user'] }).notNull().default('user'),
  hue: int('hue').notNull().default(245),
  // Soft-delete flag: deactivated members keep their expense history but cannot
  // log in and are hidden from active member pickers.
  active: boolean('active').notNull().default(true),
  // Preferred locale (e.g. 'pt-PT'); null = auto-detect from the browser.
  locale: varchar('locale', { length: 16 }),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
})

// Global key/value app settings (admin-controlled). e.g. forcedLocale.
export const settings = mysqlTable('settings', {
  key: varchar('key', { length: 191 }).primaryKey(),
  value: text('value'),
})

// Editable categories/subcategories with a name per locale. `active=false` = hidden
// (reversible), kept so historical expenses keep resolving their names.
export const categories = mysqlTable('categories', {
  id: varchar('id', { length: 64 }).primaryKey(),
  hue: int('hue').notNull().default(200),
  sort: int('sort').notNull().default(0),
  active: boolean('active').notNull().default(true),
  nameEn: varchar('name_en', { length: 255 }).notNull().default(''),
  namePt: varchar('name_pt', { length: 255 }).notNull().default(''),
  nameEs: varchar('name_es', { length: 255 }).notNull().default(''),
})

export const subcategories = mysqlTable('subcategories', {
  id: varchar('id', { length: 64 }).primaryKey(),
  categoryId: varchar('category_id', { length: 64 }).notNull().references(() => categories.id, { onDelete: 'cascade' }),
  sort: int('sort').notNull().default(0),
  active: boolean('active').notNull().default(true),
  nameEn: varchar('name_en', { length: 255 }).notNull().default(''),
  namePt: varchar('name_pt', { length: 255 }).notNull().default(''),
  nameEs: varchar('name_es', { length: 255 }).notNull().default(''),
})

export type Category = typeof categories.$inferSelect
export type Subcategory = typeof subcategories.$inferSelect

export const expenses = mysqlTable('expenses', {
  id: varchar('id', { length: 36 }).primaryKey(),
  date: varchar('date', { length: 10 }).notNull(), // ISO yyyy-mm-dd
  amountCents: int('amount_cents').notNull(),
  cat: varchar('cat', { length: 64 }).notNull(),
  sub: varchar('sub', { length: 64 }).notNull().default(''),
  note: varchar('note', { length: 500 }).notNull().default(''),
  method: varchar('method', { length: 64 }).notNull().default(''),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
})

export const chatConversations = mysqlTable('chat_conversations', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull().default('Nova conversa'),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
})

export const chatMessages = mysqlTable('chat_messages', {
  id: varchar('id', { length: 36 }).primaryKey(),
  conversationId: varchar('conversation_id', { length: 36 }).notNull().references(() => chatConversations.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 16, enum: ['user', 'assistant', 'tool'] }).notNull(),
  content: text('content').notNull(),
  toolCalls: text('tool_calls'), // JSON string | null  (assistant tool_calls)
  toolCallId: varchar('tool_call_id', { length: 64 }), // for role:tool — which call it answers
  toolName: varchar('tool_name', { length: 64 }), // for role:tool / convenience
  cards: text('cards'), // JSON string | null — confirm/chart descriptors attached to an assistant turn
  segments: text('segments'), // JSON string | null — ordered render segments (text/tool/card) for a response
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
})

export const sessions = mysqlTable('sessions', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  userAgent: varchar('user_agent', { length: 300 }).notNull().default(''),
  ip: varchar('ip', { length: 64 }).notNull().default(''),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  lastSeenAt: bigint('last_seen_at', { mode: 'number' }).notNull(),
  revokedAt: bigint('revoked_at', { mode: 'number' }), // null = active
})

export type User = typeof users.$inferSelect
export type Expense = typeof expenses.$inferSelect
export type Session = typeof sessions.$inferSelect
export type ChatConversation = typeof chatConversations.$inferSelect
export type ChatMessage = typeof chatMessages.$inferSelect
