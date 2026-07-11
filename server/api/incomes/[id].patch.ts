import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, schema } from '../../utils/db'
import { broadcastIncomeUpsert } from '../../utils/realtime'

const Body = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  amount: z.number().positive().optional(),
  source: z.string().optional(),
  note: z.string().optional(),
  who: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireDbUser(event)
  const id = getRouterParam(event, 'id')!
  const body = await readValidatedBody(event, Body.parse)

  const [existing] = await db.select().from(schema.incomes).where(eq(schema.incomes.id, id)).limit(1)
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Rendimento não encontrado' })

  // Permission: a normal user may only edit their own incomes.
  if (user.role !== 'admin' && existing.userId !== user.id) {
    throw createError({ statusCode: 403, statusMessage: 'Só pode editar os seus rendimentos.' })
  }

  const patch: Record<string, unknown> = {}
  if (body.date !== undefined) patch.date = body.date
  if (body.amount !== undefined) patch.amountCents = Math.round(body.amount * 100)
  if (body.source !== undefined) patch.source = body.source
  if (body.note !== undefined) patch.note = body.note
  if (user.role === 'admin' && body.who !== undefined) {
    const [target] = await db.select().from(schema.users).where(eq(schema.users.id, body.who)).limit(1)
    if (!target || !target.active) throw createError({ statusCode: 400, statusMessage: 'Membro inválido.' })
    patch.userId = body.who
  }

  if (Object.keys(patch).length) await db.update(schema.incomes).set(patch).where(eq(schema.incomes.id, id))
  const [updated] = await db.select().from(schema.incomes).where(eq(schema.incomes.id, id)).limit(1)
  if (updated) broadcastIncomeUpsert(updated)
  return updated
})
