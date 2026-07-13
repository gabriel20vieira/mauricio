import { loadIncomeCategories } from '../../utils/incomeCategories'

export default defineEventHandler(async (event) => {
  await requireUserSession(event)
  const cats = await loadIncomeCategories()
  return cats.map(c => ({
    id: c.id, hue: c.hue, sort: c.sort, active: c.active, description: c.description,
    names: { en: c.nameEn, pt: c.namePt, es: c.nameEs },
  }))
})
