import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['admin', 'user'] }).notNull().default('user'),
  hue: integer('hue').notNull().default(245),
  // Soft-delete flag: deactivated members keep their expense history but cannot
  // log in and are hidden from active member pickers.
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  // Preferred locale (e.g. 'pt-PT'); null = auto-detect from the browser.
  locale: text('locale'),
  createdAt: integer('created_at').notNull(),
})

// Global key/value app settings (admin-controlled). e.g. forcedLocale.
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value'),
})

// Editable categories/subcategories with a name per locale. `active=false` = hidden
// (reversible), kept so historical expenses keep resolving their names.
export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  hue: integer('hue').notNull().default(200),
  sort: integer('sort').notNull().default(0),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  nameEn: text('name_en').notNull().default(''),
  namePt: text('name_pt').notNull().default(''),
  nameEs: text('name_es').notNull().default(''),
})

export const subcategories = sqliteTable('subcategories', {
  id: text('id').primaryKey(),
  categoryId: text('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
  sort: integer('sort').notNull().default(0),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  nameEn: text('name_en').notNull().default(''),
  namePt: text('name_pt').notNull().default(''),
  nameEs: text('name_es').notNull().default(''),
})

export type Category = typeof categories.$inferSelect
export type Subcategory = typeof subcategories.$inferSelect

export const expenses = sqliteTable('expenses', {
  id: text('id').primaryKey(),
  date: text('date').notNull(), // ISO yyyy-mm-dd
  amountCents: integer('amount_cents').notNull(),
  cat: text('cat').notNull(),
  sub: text('sub').notNull().default(''),
  note: text('note').notNull().default(''),
  method: text('method').notNull().default(''),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at').notNull(),
})

export const chatConversations = sqliteTable('chat_conversations', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull().default('Nova conversa'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
})

export const chatMessages = sqliteTable('chat_messages', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').notNull().references(() => chatConversations.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['user', 'assistant', 'tool'] }).notNull(),
  content: text('content').notNull().default(''),
  toolCalls: text('tool_calls'), // JSON string | null  (assistant tool_calls)
  toolCallId: text('tool_call_id'), // for role:tool — which call it answers
  toolName: text('tool_name'), // for role:tool / convenience
  cards: text('cards'), // JSON string | null — confirm/chart descriptors attached to an assistant turn
  segments: text('segments'), // JSON string | null — ordered render segments (text/tool/card) for a response
  createdAt: integer('created_at').notNull(),
})

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  userAgent: text('user_agent').notNull().default(''),
  ip: text('ip').notNull().default(''),
  createdAt: integer('created_at').notNull(),
  lastSeenAt: integer('last_seen_at').notNull(),
  revokedAt: integer('revoked_at'), // null = active
})

export type User = typeof users.$inferSelect
export type Expense = typeof expenses.$inferSelect
export type Session = typeof sessions.$inferSelect
export type ChatConversation = typeof chatConversations.$inferSelect
export type ChatMessage = typeof chatMessages.$inferSelect
