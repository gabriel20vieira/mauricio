import { eq } from 'drizzle-orm'
import { db, schema } from '../../utils/db'
import { broadcastIncomeDelete } from '../../utils/realtime'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const id = getRouterParam(event, 'id')!

  const [existing] = await db.select().from(schema.incomes).where(eq(schema.incomes.id, id)).limit(1)
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Rendimento não encontrado' })
  if (user.role !== 'admin' && existing.userId !== user.id) {
    throw createError({ statusCode: 403, statusMessage: 'Só pode apagar os seus rendimentos.' })
  }

  await db.delete(schema.incomes).where(eq(schema.incomes.id, id))
  broadcastIncomeDelete(id)
  return { ok: true }
})
