import { asc, eq } from 'drizzle-orm'
import { db, schema } from './db'
import type { IncomeCategory } from '../db/schema'
import { localeKey } from './categories'

// Flat income-category access (no subcategories). Mirrors the reduced surface of
// categories.ts. Kept separate so income categories never mix with expense ones.

export interface IncomeCategoryDTO {
  id: string
  hue: number
  sort: number
  active: boolean
  description: string
  names: { en: string, pt: string, es: string }
}

export function toIncomeCategoryDTO(c: IncomeCategory): IncomeCategoryDTO {
  return {
    id: c.id, hue: c.hue, sort: c.sort, active: c.active, description: c.description,
    names: { en: c.nameEn, pt: c.namePt, es: c.nameEs },
  }
}

export async function loadIncomeCategoryDTO(id: string): Promise<IncomeCategoryDTO | null> {
  const [c] = await db.select().from(schema.incomeCategories).where(eq(schema.incomeCategories.id, id)).limit(1)
  return c ? toIncomeCategoryDTO(c) : null
}

export function incomeCatName(c: IncomeCategory, locale?: string): string {
  const k = localeKey(locale)
  return (k === 'pt' ? c.namePt : k === 'es' ? c.nameEs : c.nameEn) || c.nameEn || c.namePt || c.id
}

export function loadIncomeCategories(): Promise<IncomeCategory[]> {
  return db.select().from(schema.incomeCategories).orderBy(asc(schema.incomeCategories.sort))
}

// Map of income-category id -> localized name (active + inactive, for history).
export async function incomeCatNameMap(locale?: string): Promise<Record<string, string>> {
  return Object.fromEntries((await loadIncomeCategories()).map(c => [c.id, incomeCatName(c, locale)]))
}
