import { eq } from 'drizzle-orm'
import { db, schema } from '../../utils/db'
import { broadcastExpenseDelete } from '../../utils/realtime'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const id = getRouterParam(event, 'id')!

  const [existing] = await db.select().from(schema.expenses).where(eq(schema.expenses.id, id)).limit(1)
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Gasto não encontrado' })
  if (user.role !== 'admin' && existing.userId !== user.id) {
    throw createError({ statusCode: 403, statusMessage: 'Só pode apagar os seus gastos.' })
  }

  await db.delete(schema.expenses).where(eq(schema.expenses.id, id))
  broadcastExpenseDelete(id)
  return { ok: true }
})
