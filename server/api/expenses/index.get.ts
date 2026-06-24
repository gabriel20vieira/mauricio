import { desc } from 'drizzle-orm'
import { db, schema } from '../../utils/db'

export default defineEventHandler(async (event) => {
  await requireUserSession(event)
  return db.select().from(schema.expenses).orderBy(desc(schema.expenses.date), desc(schema.expenses.createdAt))
})
