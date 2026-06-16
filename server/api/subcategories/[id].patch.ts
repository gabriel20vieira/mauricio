import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, schema } from '../../utils/db'

const Body = z.object({
  active: z.boolean().optional(),
  names: z.object({ en: z.string().trim(), pt: z.string().trim(), es: z.string().trim() }).partial().optional(),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')!
  const target = db.select().from(schema.subcategories).where(eq(schema.subcategories.id, id)).get()
  if (!target) throw createError({ statusCode: 404, statusMessage: 'Subcategoria não encontrada' })

  const body = await readValidatedBody(event, Body.parse)
  const patch: Record<string, unknown> = {}
  if (body.active !== undefined) patch.active = body.active
  if (body.names?.en !== undefined) patch.nameEn = body.names.en
  if (body.names?.pt !== undefined) patch.namePt = body.names.pt
  if (body.names?.es !== undefined) patch.nameEs = body.names.es

  if (Object.keys(patch).length) db.update(schema.subcategories).set(patch).where(eq(schema.subcategories.id, id)).run()
  return { ok: true }
})
