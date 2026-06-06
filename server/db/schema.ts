import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['admin', 'user'] }).notNull().default('user'),
  hue: integer('hue').notNull().default(245),
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

export type User = typeof users.$inferSelect
export type Expense = typeof expenses.$inferSelect
