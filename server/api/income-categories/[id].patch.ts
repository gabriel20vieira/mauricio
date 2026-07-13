import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, schema } from '../../utils/db'
import { broadcastIncomeCategoryUpsert } from '../../utils/realtime'
import { loadIncomeCategoryDTO } from '../../utils/incomeCategories'

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
  const [target] = await db.select().from(schema.incomeCategories).where(eq(schema.incomeCategories.id, id)).limit(1)
  if (!target) throw createError({ statusCode: 404, statusMessage: 'Categoria não encontrada' })

  const patch: Record<string, unknown> = {}
  if (body.hue !== undefined) patch.hue = body.hue
  if (body.active !== undefined) patch.active = body.active
  if (body.names?.en !== undefined) patch.nameEn = body.names.en
  if (body.names?.pt !== undefined) patch.namePt = body.names.pt
  if (body.names?.es !== undefined) patch.nameEs = body.names.es
  if (body.description !== undefined) patch.description = body.description

  if (Object.keys(patch).length) await db.update(schema.incomeCategories).set(patch).where(eq(schema.incomeCategories.id, id))
  const dto = await loadIncomeCategoryDTO(id)
  if (dto) broadcastIncomeCategoryUpsert(dto)
  return { ok: true }
})
