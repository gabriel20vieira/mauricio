import { sql } from 'drizzle-orm'
import type BetterSqlite3 from 'better-sqlite3'

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

export function seedCategoriesIfEmpty(sqlite: BetterSqlite3.Database) {
  const count = (sqlite.prepare('SELECT COUNT(*) AS c FROM categories').get() as { c: number }).c
  if (count > 0) return

  const insCat = sqlite.prepare('INSERT INTO categories (id, hue, sort, active, name_en, name_pt, name_es) VALUES (?, ?, ?, 1, ?, ?, ?)')
  const insSub = sqlite.prepare('INSERT INTO subcategories (id, category_id, sort, active, name_en, name_pt, name_es) VALUES (?, ?, ?, 1, ?, ?, ?)')
  const migrateSub = sqlite.prepare('UPDATE expenses SET sub = ? WHERE cat = ? AND sub = ?')

  const tx = sqlite.transaction(() => {
    SEED.forEach((c, ci) => {
      insCat.run(c.id, c.hue, ci, c.en, c.pt, c.es)
      c.subs.forEach((s, si) => {
        const subId = `${c.id}-${si + 1}`
        insSub.run(subId, c.id, si, s.en, s.pt, s.es)
        // Legacy expenses stored the PT label in `sub`; point them at the new id.
        migrateSub.run(subId, c.id, s.pt)
      })
    })
  })
  tx()
}
