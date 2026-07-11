import { desc } from 'drizzle-orm'
import { db, schema } from '../../utils/db'

export default defineEventHandler(async (event) => {
  await requireUserSession(event)
  return db.select().from(schema.incomes).orderBy(desc(schema.incomes.date), desc(schema.incomes.createdAt))
})
