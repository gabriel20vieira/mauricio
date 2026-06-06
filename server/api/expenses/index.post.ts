import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { db, schema } from '../../utils/db'

const Body = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  amount: z.number().positive('Valor deve ser positivo'),
  cat: z.string().min(1),
  sub: z.string().default(''),
  note: z.string().default(''),
  method: z.string().default(''),
  who: z.string().optional(), // userId — admin may set; others forced to self
})

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const body = await readValidatedBody(event, Body.parse)

  // Only admins can record an expense on behalf of someone else.
  const userId = user.role === 'admin' && body.who ? body.who : user.id

  const row = {
    id: randomUUID(),
    date: body.date,
    amountCents: Math.round(body.amount * 100),
    cat: body.cat,
    sub: body.sub,
    note: body.note,
    method: body.method,
    userId,
    createdAt: Date.now(),
  }
  db.insert(schema.expenses).values(row).run()
  return row
})
