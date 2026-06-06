import { eq, and, ne } from 'drizzle-orm'
import { db, schema } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const id = getRouterParam(event, 'id')!

  const target = db.select().from(schema.users).where(eq(schema.users.id, id)).get()
  if (!target) throw createError({ statusCode: 404, statusMessage: 'Membro não encontrado' })
  if (admin.id === id) throw createError({ statusCode: 400, statusMessage: 'Não pode apagar a sua própria conta.' })

  if (target.role === 'admin') {
    const otherAdmins = db.select().from(schema.users)
      .where(and(eq(schema.users.role, 'admin'), ne(schema.users.id, id))).all().length
    if (otherAdmins === 0) throw createError({ statusCode: 400, statusMessage: 'Tem de existir pelo menos um administrador.' })
  }

  // Expenses cascade-delete via the FK.
  db.delete(schema.users).where(eq(schema.users.id, id)).run()
  return { ok: true }
})
