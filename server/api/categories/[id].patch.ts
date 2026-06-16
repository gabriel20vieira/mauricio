import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, schema } from '../../utils/db'

const Body = z.object({
  hue: z.number().int().min(0).max(360).optional(),
  active: z.boolean().optional(),
  names: z.object({ en: z.string().trim(), pt: z.string().trim(), es: z.string().trim() }).partial().optional(),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')!
  const body = await readValidatedBody(event, Body.parse)
  const target = db.select().from(schema.categories).where(eq(schema.categories.id, id)).get()
  if (!target) throw createError({ statusCode: 404, statusMessage: 'Categoria não encontrada' })

  const patch: Record<string, unknown> = {}
  if (body.hue !== undefined) patch.hue = body.hue
  if (body.active !== undefined) patch.active = body.active
  if (body.names?.en !== undefined) patch.nameEn = body.names.en
  if (body.names?.pt !== undefined) patch.namePt = body.names.pt
  if (body.names?.es !== undefined) patch.nameEs = body.names.es

  if (Object.keys(patch).length) db.update(schema.categories).set(patch).where(eq(schema.categories.id, id)).run()
  return { ok: true }
})
