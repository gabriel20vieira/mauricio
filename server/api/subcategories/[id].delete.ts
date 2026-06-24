import { eq } from 'drizzle-orm'
import { db, schema } from '../../utils/db'

// Soft-delete: hide the subcategory (reversible). Historical expenses keep it.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')!
  const [target] = await db.select().from(schema.subcategories).where(eq(schema.subcategories.id, id)).limit(1)
  if (!target) throw createError({ statusCode: 404, statusMessage: 'Subcategoria não encontrada' })
  await db.update(schema.subcategories).set({ active: false }).where(eq(schema.subcategories.id, id))
  return { ok: true }
})
