import { db, schema } from '../../utils/db'

// Admin-only JSON export. scope=total → whole app (users incl. password hashes —
// needed to restore logins; the UI warns the file is sensitive). scope=parcial →
// movements only (expenses + incomes).
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const scope = getQuery(event).scope === 'total' ? 'total' : 'parcial'
  const today = new Date().toISOString().slice(0, 10)

  let data: Record<string, unknown>
  if (scope === 'total') {
    const [users, settings, categories, subcategories, incomeCategories, expenses, incomes, chatConversations, chatMessages] = await Promise.all([
      db.select().from(schema.users),
      db.select().from(schema.settings),
      db.select().from(schema.categories),
      db.select().from(schema.subcategories),
      db.select().from(schema.incomeCategories),
      db.select().from(schema.expenses),
      db.select().from(schema.incomes),
      db.select().from(schema.chatConversations),
      db.select().from(schema.chatMessages),
    ])
    data = { users, settings, categories, subcategories, incomeCategories, expenses, incomes, chatConversations, chatMessages }
  } else {
    const [expenses, incomes] = await Promise.all([
      db.select().from(schema.expenses),
      db.select().from(schema.incomes),
    ])
    data = { expenses, incomes }
  }

  setHeader(event, 'Content-Disposition', `attachment; filename="mauricio-${scope === 'total' ? 'total' : 'movimentos'}-${today}.json"`)
  setHeader(event, 'Content-Type', 'application/json; charset=utf-8')
  return { app: 'mauricio', kind: scope, version: 1, exportedAt: Date.now(), data }
})
