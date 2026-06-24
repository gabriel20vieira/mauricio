import { and, eq, sql } from 'drizzle-orm'
import type { MySql2Database } from 'drizzle-orm/mysql2'
import * as schema from '../db/schema'

// One-time seed of the default household categories + subcategories (names per
// locale), run when the categories table is still empty. Also migrates legacy
// expense.sub PT labels to the new subcategory ids.
interface SeedSub { en: string, pt: string, es: string }
interface SeedCat { id: string, hue: number, en: string, pt: string, es: string, subs: SeedSub[] }

const SEED: SeedCat[] = [
  { id: 'alimentacao', hue: 45, en: 'Food', pt: 'Alimentação', es: 'Alimentación', subs: [{ en: 'Home', pt: 'Casa', es: 'Casa' }, { en: 'Out', pt: 'Fora', es: 'Fuera' }] },
  { id: 'transportes', hue: 245, en: 'Transport', pt: 'Transportes', es: 'Transporte', subs: [{ en: 'Car', pt: 'Carro', es: 'Coche' }, { en: 'Public', pt: 'Públicos', es: 'Público' }] },
  { id: 'casa', hue: 155, en: 'Home', pt: 'Casa', es: 'Hogar', subs: [{ en: 'Rent', pt: 'Renda', es: 'Alquiler' }, { en: 'Maintenance', pt: 'Manutenção', es: 'Mantenimiento' }] },
  { id: 'utilidades', hue: 205, en: 'Water/Power/Gas', pt: 'Água/Luz/Gás', es: 'Agua/Luz/Gas', subs: [{ en: 'Water', pt: 'Água', es: 'Agua' }, { en: 'Power', pt: 'Luz', es: 'Luz' }, { en: 'Gas', pt: 'Gás', es: 'Gas' }] },
  { id: 'lazer', hue: 305, en: 'Leisure', pt: 'Lazer', es: 'Ocio', subs: [] },
  { id: 'higiene', hue: 345, en: 'Hygiene', pt: 'Higiene', es: 'Higiene', subs: [] },
  { id: 'reparacoes', hue: 25, en: 'Repairs', pt: 'Reparações', es: 'Reparaciones', subs: [{ en: 'Home', pt: 'Casa', es: 'Hogar' }, { en: 'Cars', pt: 'Carros', es: 'Coches' }] },
]

export async function seedCategoriesIfEmpty(db: MySql2Database<typeof schema>) {
  const [{ c }] = await db.select({ c: sql<number>`COUNT(*)` }).from(schema.categories)
  if (Number(c) > 0) return

  await db.transaction(async (tx) => {
    for (let ci = 0; ci < SEED.length; ci++) {
      const cat = SEED[ci]
      await tx.insert(schema.categories).values({
        id: cat.id, hue: cat.hue, sort: ci, active: true,
        nameEn: cat.en, namePt: cat.pt, nameEs: cat.es,
      })
      for (let si = 0; si < cat.subs.length; si++) {
        const s = cat.subs[si]
        const subId = `${cat.id}-${si + 1}`
        await tx.insert(schema.subcategories).values({
          id: subId, categoryId: cat.id, sort: si, active: true,
          nameEn: s.en, namePt: s.pt, nameEs: s.es,
        })
        // Legacy expenses stored the PT label in `sub`; point them at the new id.
        await tx.update(schema.expenses).set({ sub: subId })
          .where(and(eq(schema.expenses.cat, cat.id), eq(schema.expenses.sub, s.pt)))
      }
    }
  })
}
