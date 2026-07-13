import { sql, eq, and, or, like } from 'drizzle-orm'
import type { MySql2Database } from 'drizzle-orm/mysql2'
import * as schema from '../db/schema'

// One-time seed of the 4 default income categories (stable slug ids so the legacy
// backfill is deterministic). Runs when income_categories is still empty. Also
// backfills existing incomes: maps their legacy free-text `source` to a category.
interface SeedIncomeCat { id: string, hue: number, en: string, pt: string, es: string }

const SEED: SeedIncomeCat[] = [
  { id: 'salario', hue: 155, en: 'Salary', pt: 'Salário', es: 'Salario' },
  { id: 'subsidio', hue: 205, en: 'Subsidy', pt: 'Subsídio', es: 'Subsidio' },
  { id: 'extra', hue: 285, en: 'Extra', pt: 'Extra', es: 'Extra' },
  { id: 'outro', hue: 95, en: 'Other', pt: 'Outro', es: 'Otro' },
]

export async function seedIncomeCategoriesIfEmpty(db: MySql2Database<typeof schema>) {
  const [{ c }] = await db.select({ c: sql<number>`COUNT(*)` }).from(schema.incomeCategories)
  if (Number(c) > 0) return

  await db.transaction(async (tx) => {
    for (let i = 0; i < SEED.length; i++) {
      const cat = SEED[i]
      await tx.insert(schema.incomeCategories).values({
        id: cat.id, hue: cat.hue, sort: i, active: true,
        nameEn: cat.en, namePt: cat.pt, nameEs: cat.es, description: '',
      })
    }
    // Backfill legacy incomes (source free-text) → category id. Text match, else 'outro'.
    // Order matters least-specific last; run specific matches first so 'outro' is the fallback.
    await tx.update(schema.incomes).set({ incomeCat: 'salario' })
      .where(and(eq(schema.incomes.incomeCat, ''), like(schema.incomes.source, '%sal%')))
    await tx.update(schema.incomes).set({ incomeCat: 'subsidio' })
      .where(and(eq(schema.incomes.incomeCat, ''), or(like(schema.incomes.source, '%subs%'), like(schema.incomes.source, '%subsíd%'))))
    await tx.update(schema.incomes).set({ incomeCat: 'extra' })
      .where(and(eq(schema.incomes.incomeCat, ''), like(schema.incomes.source, '%extra%')))
    await tx.update(schema.incomes).set({ incomeCat: 'outro' })
      .where(eq(schema.incomes.incomeCat, ''))
  })
}
