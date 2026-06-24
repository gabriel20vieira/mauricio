import { asc } from 'drizzle-orm'
import { db, schema } from './db'
import type { Category, Subcategory } from '../db/schema'

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
