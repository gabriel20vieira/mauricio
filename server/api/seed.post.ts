import { randomUUID } from 'node:crypto'
import { db, userCount, schema } from '../utils/db'

// Dev convenience: loads the "Casa Silva" demo household (Apr–Jun 2026).
// Only works on an empty database. Seeded members log in with password "demo1234".
// SECURITY: disabled outside development — it would otherwise let anyone create a
// known-password admin on a fresh production deploy. Real setup is via /setup.
export default defineEventHandler(async () => {
  if (!import.meta.dev) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }
  if (userCount() > 0) {
    throw createError({ statusCode: 403, statusMessage: 'A base de dados já tem utilizadores.' })
  }

  const pw = await hashPassword('demo1234')
  const members = [
    { key: 'maria', name: 'Maria Silva', email: 'maria@casa.pt', role: 'admin' as const, hue: 245 },
    { key: 'joao', name: 'João Silva', email: 'joao@casa.pt', role: 'user' as const, hue: 25 },
    { key: 'rita', name: 'Rita Silva', email: 'rita@casa.pt', role: 'user' as const, hue: 305 },
  ]
  const ids: Record<string, string> = {}
  for (const m of members) {
    const id = randomUUID()
    ids[m.key] = id
    db.insert(schema.users).values({ id, name: m.name, email: m.email, passwordHash: pw, role: m.role, hue: m.hue, createdAt: Date.now() }).run()
  }

  const e = (date: string, amount: number, cat: string, sub: string, who: string, note: string, method: string) => ({
    id: randomUUID(), date, amountCents: Math.round(amount * 100), cat, sub, note, method, userId: ids[who], createdAt: Date.now(),
  })
  const rows = [
    e('2026-06-05', 87.45, 'alimentacao', 'Casa', 'maria', 'Continente — compra semanal', 'Cartão'),
    e('2026-06-04', 12.99, 'lazer', '', 'joao', 'Spotify Família', 'Cartão'),
    e('2026-06-03', 42.10, 'alimentacao', 'Casa', 'joao', 'Pingo Doce', 'MB Way'),
    e('2026-06-03', 38.00, 'alimentacao', 'Fora', 'rita', 'Jantar — O Tasco', 'Cartão'),
    e('2026-06-02', 40.00, 'transportes', 'Públicos', 'rita', 'Passe Navegante', 'Débito'),
    e('2026-06-02', 65.30, 'transportes', 'Carro', 'joao', 'Galp — combustível', 'Cartão'),
    e('2026-06-01', 850.00, 'casa', 'Renda', 'maria', 'Renda de junho', 'Transferência'),
    e('2026-05-30', 78.90, 'utilidades', 'Luz', 'maria', 'EDP — eletricidade', 'Débito'),
    e('2026-05-28', 31.20, 'utilidades', 'Água', 'joao', 'Águas de Lisboa', 'Débito'),
    e('2026-05-27', 24.50, 'utilidades', 'Gás', 'maria', 'Galp Gás', 'Débito'),
    e('2026-05-25', 145.00, 'reparacoes', 'Carros', 'joao', 'Mecânico — travões', 'Cartão'),
    e('2026-05-24', 18.40, 'higiene', '', 'maria', 'Farmácia Central', 'MB Way'),
    e('2026-05-22', 25.00, 'lazer', '', 'rita', 'Cinema NOS', 'Dinheiro'),
    e('2026-05-20', 92.15, 'alimentacao', 'Casa', 'maria', 'Continente', 'Cartão'),
    e('2026-05-18', 54.80, 'alimentacao', 'Fora', 'joao', 'Almoço de família', 'Cartão'),
    e('2026-05-15', 850.00, 'casa', 'Renda', 'maria', 'Renda de maio', 'Transferência'),
    e('2026-05-12', 90.00, 'reparacoes', 'Casa', 'maria', 'Canalizador — torneira', 'Dinheiro'),
    e('2026-05-10', 60.00, 'transportes', 'Carro', 'joao', 'Galp — combustível', 'Cartão'),
    e('2026-05-08', 33.70, 'higiene', '', 'rita', 'Perfumaria', 'MB Way'),
    e('2026-05-05', 21.90, 'lazer', '', 'joao', 'Livraria Bertrand', 'Cartão'),
    e('2026-05-03', 76.30, 'alimentacao', 'Casa', 'joao', 'Mercado do Bairro', 'Dinheiro'),
    e('2026-04-29', 80.10, 'utilidades', 'Luz', 'maria', 'EDP — eletricidade', 'Débito'),
    e('2026-04-27', 29.40, 'utilidades', 'Água', 'joao', 'Águas de Lisboa', 'Débito'),
    e('2026-04-25', 850.00, 'casa', 'Renda', 'maria', 'Renda de abril', 'Transferência'),
    e('2026-04-22', 112.60, 'alimentacao', 'Casa', 'maria', 'Continente — mensal', 'Cartão'),
    e('2026-04-20', 47.00, 'alimentacao', 'Fora', 'rita', 'Pizza com amigas', 'MB Way'),
    e('2026-04-18', 58.20, 'transportes', 'Carro', 'joao', 'Galp — combustível', 'Cartão'),
    e('2026-04-16', 40.00, 'transportes', 'Públicos', 'rita', 'Passe Navegante', 'Débito'),
    e('2026-04-14', 230.00, 'reparacoes', 'Casa', 'maria', 'Eletricista — quadro', 'Transferência'),
    e('2026-04-11', 15.50, 'higiene', '', 'maria', 'Farmácia', 'Dinheiro'),
    e('2026-04-09', 34.90, 'lazer', '', 'joao', 'Concerto — bilhete', 'Cartão'),
    e('2026-04-06', 68.75, 'alimentacao', 'Casa', 'joao', 'Pingo Doce', 'Cartão'),
    e('2026-04-03', 22.30, 'utilidades', 'Gás', 'maria', 'Galp Gás', 'Débito'),
  ]
  db.insert(schema.expenses).values(rows).run()
  return { ok: true, members: members.length, expenses: rows.length }
})
