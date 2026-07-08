import { eq } from 'drizzle-orm'
import { db, schema } from '../../utils/db'
import { broadcastCategoryUpsert } from '../../utils/realtime'
import { loadCategoryDTO } from '../../utils/categories'

// Soft-delete: hide the subcategory (reversible). Historical expenses keep it.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')!
  const [target] = await db.select().from(schema.subcategories).where(eq(schema.subcategories.id, id)).limit(1)
  if (!target) throw createError({ statusCode: 404, statusMessage: 'Subcategoria não encontrada' })
  await db.update(schema.subcategories).set({ active: false }).where(eq(schema.subcategories.id, id))
  const dto = await loadCategoryDTO(target.categoryId)
  if (dto) broadcastCategoryUpsert(dto)
  return { ok: true }
})
