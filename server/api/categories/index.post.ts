import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { db, schema } from '../../utils/db'

const Body = z.object({
  hue: z.number().int().min(0).max(360).default(200),
  names: z.object({ en: z.string().trim().default(''), pt: z.string().trim().default(''), es: z.string().trim().default('') }),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readValidatedBody(event, Body.parse)
  if (!body.names.en && !body.names.pt && !body.names.es) {
    throw createError({ statusCode: 400, statusMessage: 'Indique pelo menos um nome.' })
  }
  const maxSort = db.select().from(schema.categories).all().reduce((m, c) => Math.max(m, c.sort), -1)
  const row = { id: randomUUID(), hue: body.hue, sort: maxSort + 1, active: true, nameEn: body.names.en, namePt: body.names.pt, nameEs: body.names.es }
  db.insert(schema.categories).values(row).run()
  return row
})
