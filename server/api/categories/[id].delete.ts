import { eq } from 'drizzle-orm'
import { db, schema } from '../../utils/db'

// Soft-delete: hide the category (reversible). Historical expenses keep resolving
// their category name. Subcategories are hidden with it.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')!
  const target = db.select().from(schema.categories).where(eq(schema.categories.id, id)).get()
  if (!target) throw createError({ statusCode: 404, statusMessage: 'Categoria não encontrada' })
  db.update(schema.categories).set({ active: false }).where(eq(schema.categories.id, id)).run()
  return { ok: true }
})
