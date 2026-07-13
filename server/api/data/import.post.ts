import { z } from 'zod'
import { db, schema } from '../../utils/db'
import { rateLimit } from '../../utils/rateLimit'
import { broadcastBulkRefresh } from '../../utils/realtime'

// Admin-only JSON import.
// kind=total → REPLACES the whole app inside one transaction (all sessions are
// wiped; the importer is logged out). kind=parcial → additive: inserts only
// movements whose id does not exist yet; never updates existing rows.

const DateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const Id = z.string().min(1).max(64)
const Millis = z.number().int().nonnegative()

const ExpenseRow = z.object({
  id: Id,
  date: DateStr,
  amountCents: z.number().int().positive(),
  cat: z.string().max(64),
  sub: z.string().max(64).default(''),
  note: z.string().max(500).default(''),
  method: z.string().max(64).default(''),
  userId: Id,
  createdAt: Millis,
})
const IncomeRow = z.object({
  id: Id,
  date: DateStr,
  amountCents: z.number().int().positive(),
  incomeCat: z.string().max(64).default(''),
  source: z.string().max(120).default(''), // legacy free-text (older exports)
  note: z.string().max(500).default(''),
  userId: Id,
  createdAt: Millis,
})
const UserRow = z.object({
  id: Id,
  name: z.string().min(1).max(255),
  email: z.string().min(3).max(255),
  passwordHash: z.string().min(1).max(255),
  role: z.enum(['admin', 'user']),
  hue: z.number().int(),
  active: z.boolean(),
  locale: z.string().max(16).nullable().default(null),
  createdAt: Millis,
})
const SettingRow = z.object({ key: z.string().min(1).max(191), value: z.string().nullable().default(null) })
const CategoryRow = z.object({
  id: Id, hue: z.number().int(), sort: z.number().int(), active: z.boolean(),
  nameEn: z.string().max(255).default(''), namePt: z.string().max(255).default(''), nameEs: z.string().max(255).default(''),
  description: z.string().max(255).default(''),
})
const SubcategoryRow = CategoryRow.omit({ hue: true }).extend({ categoryId: Id })
const IncomeCategoryRow = CategoryRow // same flat shape (id, hue, sort, active, names, description)
const ChatConversationRow = z.object({
  id: Id, userId: Id, title: z.string().max(255).default('Nova conversa'), createdAt: Millis, updatedAt: Millis,
})
const ChatMessageRow = z.object({
  id: Id, conversationId: Id, role: z.enum(['user', 'assistant', 'tool']), content: z.string(),
  toolCalls: z.string().nullable().default(null), toolCallId: z.string().max(64).nullable().default(null),
  toolName: z.string().max(64).nullable().default(null), cards: z.string().nullable().default(null),
  segments: z.string().nullable().default(null), createdAt: Millis,
})

const TotalData = z.object({
  users: z.array(UserRow).min(1),
  settings: z.array(SettingRow).default([]),
  categories: z.array(CategoryRow).default([]),
  subcategories: z.array(SubcategoryRow).default([]),
  incomeCategories: z.array(IncomeCategoryRow).default([]),
  expenses: z.array(ExpenseRow).default([]),
  incomes: z.array(IncomeRow).default([]),
  chatConversations: z.array(ChatConversationRow).default([]),
  chatMessages: z.array(ChatMessageRow).default([]),
})
const PartialData = z.object({
  expenses: z.array(ExpenseRow).default([]),
  incomes: z.array(IncomeRow).default([]),
})

const Envelope = z.object({
  app: z.literal('mauricio'),
  kind: z.enum(['total', 'parcial']),
  version: z.literal(1),
  data: z.record(z.string(), z.unknown()),
})

function chunks<T>(rows: T[], size = 500): T[][] {
  const out: T[][] = []
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size))
  return out
}

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  rateLimit(event, { key: 'data-import', limit: 5, windowMs: 60_000 })
  const raw = await readBody(event)
  const env = Envelope.safeParse(raw)
  if (!env.success) throw createError({ statusCode: 400, statusMessage: 'Ficheiro inválido: não é um export desta aplicação (v1).' })

  if (env.data.kind === 'total') {
    const parsed = TotalData.safeParse(env.data.data)
    if (!parsed.success) throw createError({ statusCode: 400, statusMessage: `Dados inválidos: ${parsed.error.issues[0]?.path.join('.')} — ${parsed.error.issues[0]?.message}` })
    const d = parsed.data

    // The file must leave the app usable: at least one active admin to log in with.
    if (!d.users.some(u => u.role === 'admin' && u.active)) {
      throw createError({ statusCode: 400, statusMessage: 'O ficheiro não tem nenhum administrador ativo — import recusado.' })
    }

    // Internal FK integrity — fail with a report before touching the DB.
    const userIds = new Set(d.users.map(u => u.id))
    const catIds = new Set(d.categories.map(c => c.id))
    const convIds = new Set(d.chatConversations.map(c => c.id))
    const problems: string[] = []
    for (const e of d.expenses) if (!userIds.has(e.userId)) { problems.push(`gasto ${e.id}: membro ${e.userId} não existe no ficheiro`); break }
    for (const i of d.incomes) if (!userIds.has(i.userId)) { problems.push(`rendimento ${i.id}: membro ${i.userId} não existe no ficheiro`); break }
    for (const s of d.subcategories) if (!catIds.has(s.categoryId)) { problems.push(`subcategoria ${s.id}: categoria ${s.categoryId} não existe no ficheiro`); break }
    for (const c of d.chatConversations) if (!userIds.has(c.userId)) { problems.push(`conversa ${c.id}: membro ${c.userId} não existe no ficheiro`); break }
    for (const m of d.chatMessages) if (!convIds.has(m.conversationId)) { problems.push(`mensagem ${m.id}: conversa ${m.conversationId} não existe no ficheiro`); break }
    if (problems.length) throw createError({ statusCode: 400, statusMessage: `Ficheiro inconsistente: ${problems.join('; ')}` })

    await db.transaction(async (tx) => {
      // Wipe children → parents (sessions included: everyone re-authenticates).
      await tx.delete(schema.chatMessages)
      await tx.delete(schema.chatConversations)
      await tx.delete(schema.sessions)
      await tx.delete(schema.expenses)
      await tx.delete(schema.incomes)
      await tx.delete(schema.subcategories)
      await tx.delete(schema.categories)
      await tx.delete(schema.incomeCategories)
      await tx.delete(schema.users)
      await tx.delete(schema.settings)
      // Insert parents → children, chunked to stay under the MySQL packet limit.
      for (const c of chunks(d.users)) await tx.insert(schema.users).values(c)
      for (const c of chunks(d.settings)) await tx.insert(schema.settings).values(c)
      for (const c of chunks(d.categories)) await tx.insert(schema.categories).values(c)
      for (const c of chunks(d.subcategories)) await tx.insert(schema.subcategories).values(c)
      for (const c of chunks(d.incomeCategories)) await tx.insert(schema.incomeCategories).values(c)
      for (const c of chunks(d.expenses)) await tx.insert(schema.expenses).values(c)
      for (const c of chunks(d.incomes)) await tx.insert(schema.incomes).values(c)
      for (const c of chunks(d.chatConversations)) await tx.insert(schema.chatConversations).values(c)
      for (const c of chunks(d.chatMessages)) await tx.insert(schema.chatMessages).values(c)
    })

    // Sessions are gone (including the importer's DB session row); drop the cookie
    // so the client lands cleanly on /login.
    await clearUserSession(event)
    return {
      ok: true,
      loggedOut: true,
      counts: {
        users: d.users.length, categories: d.categories.length, subcategories: d.subcategories.length,
        incomeCategories: d.incomeCategories.length,
        expenses: d.expenses.length, incomes: d.incomes.length,
        chatConversations: d.chatConversations.length, chatMessages: d.chatMessages.length,
      },
    }
  }

  // ---- parcial: additive movements import ----
  const parsed = PartialData.safeParse(env.data.data)
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: `Dados inválidos: ${parsed.error.issues[0]?.path.join('.')} — ${parsed.error.issues[0]?.message}` })
  const d = parsed.data

  const [members, existingExpenses, existingIncomes, categories] = await Promise.all([
    db.select({ id: schema.users.id }).from(schema.users),
    db.select({ id: schema.expenses.id }).from(schema.expenses),
    db.select({ id: schema.incomes.id }).from(schema.incomes),
    db.select({ id: schema.categories.id }).from(schema.categories),
  ])
  const memberIds = new Set(members.map(m => m.id))
  const expenseIds = new Set(existingExpenses.map(e => e.id))
  const incomeIds = new Set(existingIncomes.map(i => i.id))
  const catIds = new Set(categories.map(c => c.id))

  const newExpenses = d.expenses.filter(e => !expenseIds.has(e.id))
  const newIncomes = d.incomes.filter(i => !incomeIds.has(i.id))
  const skipped = (d.expenses.length - newExpenses.length) + (d.incomes.length - newIncomes.length)

  // Unknown members block the whole import (attribution must never change silently).
  const missingMembers = [...new Set([...newExpenses, ...newIncomes].map(r => r.userId).filter(id => !memberIds.has(id)))]
  if (missingMembers.length) {
    throw createError({
      statusCode: 400,
      statusMessage: `Membros inexistentes nesta instância: ${missingMembers.join(', ')}. Nada foi importado.`,
      data: { missingMembers },
    })
  }
  // Unknown categories don't block (UI falls back to the raw id) — reported as a warning.
  const unknownCategories = [...new Set(newExpenses.map(e => e.cat).filter(c => c && !catIds.has(c)))]

  await db.transaction(async (tx) => {
    for (const c of chunks(newExpenses)) await tx.insert(schema.expenses).values(c)
    for (const c of chunks(newIncomes)) await tx.insert(schema.incomes).values(c)
  })
  if (newExpenses.length || newIncomes.length) broadcastBulkRefresh()

  return {
    ok: true,
    added: { expenses: newExpenses.length, incomes: newIncomes.length },
    skipped,
    unknownCategories,
    importedBy: user.id,
  }
})
