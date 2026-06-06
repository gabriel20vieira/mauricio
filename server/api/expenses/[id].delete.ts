import { eq } from 'drizzle-orm'
import { db, schema } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const id = getRouterParam(event, 'id')!

  const existing = db.select().from(schema.expenses).where(eq(schema.expenses.id, id)).get()
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Gasto não encontrado' })
  if (user.role !== 'admin' && existing.userId !== user.id) {
    throw createError({ statusCode: 403, statusMessage: 'Só pode apagar os seus gastos.' })
  }

  db.delete(schema.expenses).where(eq(schema.expenses.id, id)).run()
  return { ok: true }
})
