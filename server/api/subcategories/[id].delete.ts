import { eq } from 'drizzle-orm'
import { db, schema } from '../../utils/db'

// Soft-delete: hide the subcategory (reversible). Historical expenses keep it.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')!
  const target = db.select().from(schema.subcategories).where(eq(schema.subcategories.id, id)).get()
  if (!target) throw createError({ statusCode: 404, statusMessage: 'Subcategoria não encontrada' })
  db.update(schema.subcategories).set({ active: false }).where(eq(schema.subcategories.id, id)).run()
  return { ok: true }
})
