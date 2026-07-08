import { asc, eq } from 'drizzle-orm'
import { db, schema } from './db'
import type { Category, Subcategory } from '../db/schema'

// Shape returned by GET /api/categories and pushed over websockets — one category
// with its subcategories, names grouped per locale.
export interface CategoryDTO {
  id: string
  hue: number
  sort: number
  active: boolean
  description: string
  names: { en: string, pt: string, es: string }
  subs: { id: string, sort: number, active: boolean, description: string, names: { en: string, pt: string, es: string } }[]
}

export function toCategoryDTO(c: Category, subs: Subcategory[]): CategoryDTO {
  return {
    id: c.id, hue: c.hue, sort: c.sort, active: c.active, description: c.description,
    names: { en: c.nameEn, pt: c.namePt, es: c.nameEs },
    subs: subs.filter(s => s.categoryId === c.id).map(s => ({
      id: s.id, sort: s.sort, active: s.active, description: s.description,
      names: { en: s.nameEn, pt: s.namePt, es: s.nameEs },
    })),
  }
}

// Load a single category (with its subs) in DTO shape — used to broadcast changes.
export async function loadCategoryDTO(id: string): Promise<CategoryDTO | null> {
  const [c] = await db.select().from(schema.categories).where(eq(schema.categories.id, id)).limit(1)
  if (!c) return null
  const subs = await db.select().from(schema.subcategories)
    .where(eq(schema.subcategories.categoryId, id)).orderBy(asc(schema.subcategories.sort))
  return toCategoryDTO(c, subs)
}

export function localeKey(locale?: string): 'en' | 'pt' | 'es' {
  if (locale?.startsWith('pt')) return 'pt'
  if (locale?.startsWith('es')) return 'es'
  return 'en'
}

export function catName(c: Category, locale?: string): string {
  const k = localeKey(locale)
  return (k === 'pt' ? c.namePt : k === 'es' ? c.nameEs : c.nameEn) || c.nameEn || c.namePt || c.id
}
export function subName(s: Subcategory, locale?: string): string {
  const k = localeKey(locale)
  return (k === 'pt' ? s.namePt : k === 'es' ? s.nameEs : s.nameEn) || s.nameEn || s.namePt || s.id
}

export function loadCategories(): Promise<Category[]> {
  return db.select().from(schema.categories).orderBy(asc(schema.categories.sort))
}
export function loadSubcategories(): Promise<Subcategory[]> {
  return db.select().from(schema.subcategories).orderBy(asc(schema.subcategories.sort))
}

// Map of category/sub id -> localized name (active + inactive, for historical display).
export async function catNameMap(locale?: string): Promise<Record<string, string>> {
  return Object.fromEntries((await loadCategories()).map(c => [c.id, catName(c, locale)]))
}
export async function subNameMap(locale?: string): Promise<Record<string, string>> {
  return Object.fromEntries((await loadSubcategories()).map(s => [s.id, subName(s, locale)]))
}
