import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, schema } from '../../utils/db'
import { broadcastCategoryUpsert } from '../../utils/realtime'
import { loadCategoryDTO } from '../../utils/categories'

const Body = z.object({
  categoryId: z.string().min(1),
  names: z.object({ en: z.string().trim().default(''), pt: z.string().trim().default(''), es: z.string().trim().default('') }),
  description: z.string().trim().max(255).default(''),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readValidatedBody(event, Body.parse)
  if (!body.names.en && !body.names.pt && !body.names.es) {
    throw createError({ statusCode: 400, statusMessage: 'Indique pelo menos um nome.' })
  }
  const [cat] = await db.select().from(schema.categories).where(eq(schema.categories.id, body.categoryId)).limit(1)
  if (!cat) throw createError({ statusCode: 400, statusMessage: 'Categoria inválida.' })

  const maxSort = (await db.select().from(schema.subcategories))
    .filter(s => s.categoryId === body.categoryId).reduce((m, s) => Math.max(m, s.sort), -1)
  const row = { id: randomUUID(), categoryId: body.categoryId, sort: maxSort + 1, active: true, nameEn: body.names.en, namePt: body.names.pt, nameEs: body.names.es, description: body.description }
  await db.insert(schema.subcategories).values(row)
  const dto = await loadCategoryDTO(body.categoryId)
  if (dto) broadcastCategoryUpsert(dto)
  return row
})
