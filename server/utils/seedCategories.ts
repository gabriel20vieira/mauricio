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
  { id: 'transportes', hue: 245, en: 'Transport', pt: 'Transportes', es: 'Transporte', subs: [{ en: 'Car', pt: 'Carro', es: 'Coche' }, { en: 'Public', pt: 'Públicos', es: 'Público' }, { en: 'Repairs', pt: 'Reparações', es: 'Reparaciones' }] },
  { id: 'casa', hue: 155, en: 'Home', pt: 'Casa', es: 'Hogar', subs: [{ en: 'Rent', pt: 'Renda', es: 'Alquiler' }, { en: 'Maintenance', pt: 'Manutenção', es: 'Mantenimiento' }] },
  { id: 'utilidades', hue: 205, en: 'Water/Power/Gas', pt: 'Água/Luz/Gás', es: 'Agua/Luz/Gas', subs: [{ en: 'Water', pt: 'Água', es: 'Agua' }, { en: 'Power', pt: 'Luz', es: 'Luz' }, { en: 'Gas', pt: 'Gás', es: 'Gas' }] },
  { id: 'lazer', hue: 305, en: 'Leisure', pt: 'Lazer', es: 'Ocio', subs: [{ en: 'Sport', pt: 'Desporto', es: 'Deporte' }, { en: 'Gym', pt: 'Ginásio', es: 'Gimnasio' }] },
  { id: 'viagens', hue: 285, en: 'Travel', pt: 'Viagens', es: 'Viajes', subs: [{ en: 'Flights', pt: 'Voos', es: 'Vuelos' }, { en: 'Lodging', pt: 'Alojamento', es: 'Alojamiento' }, { en: 'Holidays', pt: 'Férias', es: 'Vacaciones' }] },
  { id: 'equipamentos', hue: 95, en: 'Equipment', pt: 'Equipamentos', es: 'Equipamiento', subs: [{ en: 'Electronics', pt: 'Eletrónicos', es: 'Electrónica' }, { en: 'Mechanical', pt: 'Mecânicos', es: 'Mecánicos' }, { en: 'Kitchen', pt: 'Cozinha', es: 'Cocina' }] },
  { id: 'saude', hue: 175, en: 'Health', pt: 'Saúde', es: 'Salud', subs: [{ en: 'Dentist', pt: 'Dentista', es: 'Dentista' }, { en: 'Hospital', pt: 'Hospital', es: 'Hospital' }, { en: 'Doctor', pt: 'Médico', es: 'Médico' }, { en: 'Hygiene', pt: 'Higiene', es: 'Higiene' }] },
  { id: 'educacao', hue: 260, en: 'Education', pt: 'Educação', es: 'Educación', subs: [{ en: 'School', pt: 'Escola', es: 'Escuela' }, { en: 'Books', pt: 'Livros', es: 'Libros' }, { en: 'Courses', pt: 'Cursos', es: 'Cursos' }] },
  { id: 'vestuario', hue: 320, en: 'Clothing', pt: 'Vestuário', es: 'Ropa', subs: [{ en: 'Clothes', pt: 'Roupa', es: 'Ropa' }, { en: 'Footwear', pt: 'Calçado', es: 'Calzado' }, { en: 'Accessories', pt: 'Acessórios', es: 'Accesorios' }] },
  { id: 'animais', hue: 130, en: 'Pets', pt: 'Animais', es: 'Mascotas', subs: [{ en: 'Vet', pt: 'Veterinário', es: 'Veterinario' }, { en: 'Food', pt: 'Comida', es: 'Comida' }, { en: 'Accessories', pt: 'Acessórios', es: 'Accesorios' }] },
  { id: 'subscricoes', hue: 190, en: 'Subscriptions', pt: 'Subscrições', es: 'Suscripciones', subs: [{ en: 'Streaming', pt: 'Streaming', es: 'Streaming' }, { en: 'Software', pt: 'Software', es: 'Software' }] },
  { id: 'seguros', hue: 220, en: 'Insurance', pt: 'Seguros', es: 'Seguros', subs: [{ en: 'Home', pt: 'Casa', es: 'Hogar' }, { en: 'Car', pt: 'Carro', es: 'Coche' }, { en: 'Health', pt: 'Saúde', es: 'Salud' }, { en: 'Life', pt: 'Vida', es: 'Vida' }] },
  { id: 'impostos', hue: 15, en: 'Taxes', pt: 'Impostos', es: 'Impuestos', subs: [{ en: 'IMI', pt: 'IMI', es: 'IMI' }, { en: 'IUC', pt: 'IUC', es: 'IUC' }, { en: 'IRS', pt: 'IRS', es: 'IRS' }] },
  { id: 'presentes', hue: 350, en: 'Gifts', pt: 'Presentes', es: 'Regalos', subs: [] },
  { id: 'poupanca', hue: 165, en: 'Savings', pt: 'Poupança', es: 'Ahorro', subs: [{ en: 'Investment', pt: 'Investimento', es: 'Inversión' }, { en: 'Emergency', pt: 'Emergência', es: 'Emergencia' }] },
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
