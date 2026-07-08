import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { db, schema } from '../../utils/db'
import { broadcastCategoryUpsert } from '../../utils/realtime'
import { loadCategoryDTO } from '../../utils/categories'

const Body = z.object({
  hue: z.number().int().min(0).max(360).default(200),
  names: z.object({ en: z.string().trim().default(''), pt: z.string().trim().default(''), es: z.string().trim().default('') }),
  description: z.string().trim().max(255).default(''),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readValidatedBody(event, Body.parse)
  if (!body.names.en && !body.names.pt && !body.names.es) {
    throw createError({ statusCode: 400, statusMessage: 'Indique pelo menos um nome.' })
  }
  const maxSort = (await db.select().from(schema.categories)).reduce((m, c) => Math.max(m, c.sort), -1)
  const row = { id: randomUUID(), hue: body.hue, sort: maxSort + 1, active: true, nameEn: body.names.en, namePt: body.names.pt, nameEs: body.names.es, description: body.description }
  await db.insert(schema.categories).values(row)
  const dto = await loadCategoryDTO(row.id)
  if (dto) broadcastCategoryUpsert(dto)
  return row
})
