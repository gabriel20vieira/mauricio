import { eq } from 'drizzle-orm'
import { db, schema } from '../../utils/db'

// Soft-delete: hide the category (reversible). Historical expenses keep resolving
// their category name. Subcategories are hidden with it.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')!
  const [target] = await db.select().from(schema.categories).where(eq(schema.categories.id, id)).limit(1)
  if (!target) throw createError({ statusCode: 404, statusMessage: 'Categoria não encontrada' })
  await db.update(schema.categories).set({ active: false }).where(eq(schema.categories.id, id))
  return { ok: true }
})
