import { eq } from 'drizzle-orm'
import { db, schema } from '../../utils/db'
import { broadcastIncomeCategoryUpsert } from '../../utils/realtime'
import { loadIncomeCategoryDTO } from '../../utils/incomeCategories'

// Soft-delete: hide the income category (reversible). Historical incomes keep
// resolving their category name.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')!
  const [target] = await db.select().from(schema.incomeCategories).where(eq(schema.incomeCategories.id, id)).limit(1)
  if (!target) throw createError({ statusCode: 404, statusMessage: 'Categoria não encontrada' })
  await db.update(schema.incomeCategories).set({ active: false }).where(eq(schema.incomeCategories.id, id))
  const dto = await loadIncomeCategoryDTO(id)
  if (dto) broadcastIncomeCategoryUpsert(dto)
  return { ok: true }
})
