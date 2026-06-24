import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, schema } from '../../utils/db'

const Body = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  amount: z.number().positive().optional(),
  cat: z.string().min(1).optional(),
  sub: z.string().optional(),
  note: z.string().optional(),
  method: z.string().optional(),
  who: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireDbUser(event)
  const id = getRouterParam(event, 'id')!
  const body = await readValidatedBody(event, Body.parse)

  const [existing] = await db.select().from(schema.expenses).where(eq(schema.expenses.id, id)).limit(1)
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Gasto não encontrado' })

  // Permission: a normal user may only edit their own expenses.
  if (user.role !== 'admin' && existing.userId !== user.id) {
    throw createError({ statusCode: 403, statusMessage: 'Só pode editar os seus gastos.' })
  }

  const patch: Record<string, unknown> = {}
  if (body.date !== undefined) patch.date = body.date
  if (body.amount !== undefined) patch.amountCents = Math.round(body.amount * 100)
  if (body.cat !== undefined) patch.cat = body.cat
  if (body.sub !== undefined) patch.sub = body.sub
  if (body.note !== undefined) patch.note = body.note
  if (body.method !== undefined) patch.method = body.method
  if (user.role === 'admin' && body.who !== undefined) {
    const [target] = await db.select().from(schema.users).where(eq(schema.users.id, body.who)).limit(1)
    if (!target || !target.active) throw createError({ statusCode: 400, statusMessage: 'Membro inválido.' })
    patch.userId = body.who
  }

  if (Object.keys(patch).length) await db.update(schema.expenses).set(patch).where(eq(schema.expenses.id, id))
  const [updated] = await db.select().from(schema.expenses).where(eq(schema.expenses.id, id)).limit(1)
  return updated
})
