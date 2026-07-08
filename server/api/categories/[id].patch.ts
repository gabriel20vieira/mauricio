import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, schema } from '../../utils/db'
import { broadcastCategoryUpsert } from '../../utils/realtime'
import { loadCategoryDTO } from '../../utils/categories'

const Body = z.object({
  hue: z.number().int().min(0).max(360).optional(),
  active: z.boolean().optional(),
  names: z.object({ en: z.string().trim(), pt: z.string().trim(), es: z.string().trim() }).partial().optional(),
  description: z.string().trim().max(255).optional(),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')!
  const body = await readValidatedBody(event, Body.parse)
  const [target] = await db.select().from(schema.categories).where(eq(schema.categories.id, id)).limit(1)
  if (!target) throw createError({ statusCode: 404, statusMessage: 'Categoria não encontrada' })

  const patch: Record<string, unknown> = {}
  if (body.hue !== undefined) patch.hue = body.hue
  if (body.active !== undefined) patch.active = body.active
  if (body.names?.en !== undefined) patch.nameEn = body.names.en
  if (body.names?.pt !== undefined) patch.namePt = body.names.pt
  if (body.names?.es !== undefined) patch.nameEs = body.names.es
  if (body.description !== undefined) patch.description = body.description

  if (Object.keys(patch).length) await db.update(schema.categories).set(patch).where(eq(schema.categories.id, id))
  const dto = await loadCategoryDTO(id)
  if (dto) broadcastCategoryUpsert(dto)
  return { ok: true }
})
