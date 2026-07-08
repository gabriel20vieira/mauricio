import { loadCategories, loadSubcategories } from '../../utils/categories'

export default defineEventHandler(async (event) => {
  await requireUserSession(event)
  const [cats, subs] = await Promise.all([loadCategories(), loadSubcategories()])
  return cats.map(c => ({
    id: c.id, hue: c.hue, sort: c.sort, active: c.active, description: c.description,
    names: { en: c.nameEn, pt: c.namePt, es: c.nameEs },
    subs: subs.filter(s => s.categoryId === c.id).map(s => ({
      id: s.id, sort: s.sort, active: s.active, description: s.description,
      names: { en: s.nameEn, pt: s.namePt, es: s.nameEs },
    })),
  }))
})
