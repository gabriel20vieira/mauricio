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
  createdAt: integer('created_at').notNull(),
})

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
