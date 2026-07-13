import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { db, schema } from '../../utils/db'
import { broadcastIncomeCategoryUpsert } from '../../utils/realtime'
import { loadIncomeCategoryDTO } from '../../utils/incomeCategories'

const Body = z.object({
  hue: z.number().int().min(0).max(360).default(155),
  names: z.object({ en: z.string().trim().default(''), pt: z.string().trim().default(''), es: z.string().trim().default('') }),
  description: z.string().trim().max(255).default(''),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readValidatedBody(event, Body.parse)
  if (!body.names.en && !body.names.pt && !body.names.es) {
    throw createError({ statusCode: 400, statusMessage: 'Indique pelo menos um nome.' })
  }
  const maxSort = (await db.select().from(schema.incomeCategories)).reduce((m, c) => Math.max(m, c.sort), -1)
  const row = { id: randomUUID(), hue: body.hue, sort: maxSort + 1, active: true, nameEn: body.names.en, namePt: body.names.pt, nameEs: body.names.es, description: body.description }
  await db.insert(schema.incomeCategories).values(row)
  const dto = await loadIncomeCategoryDTO(row.id)
  if (dto) broadcastIncomeCategoryUpsert(dto)
  return row
})
