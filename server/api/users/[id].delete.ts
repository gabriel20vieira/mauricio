import { eq, and, ne } from 'drizzle-orm'
import { db, schema } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const id = getRouterParam(event, 'id')!

  const target = db.select().from(schema.users).where(eq(schema.users.id, id)).get()
  if (!target) throw createError({ statusCode: 404, statusMessage: 'Membro não encontrado' })
  if (admin.id === id) throw createError({ statusCode: 400, statusMessage: 'Não pode apagar a sua própria conta.' })

  if (target.role === 'admin') {
    const otherActiveAdmins = db.select().from(schema.users)
      .where(and(eq(schema.users.role, 'admin'), eq(schema.users.active, true), ne(schema.users.id, id))).all().length
    if (otherActiveAdmins === 0) throw createError({ statusCode: 400, statusMessage: 'Tem de existir pelo menos um administrador.' })
  }

  // Soft-delete: deactivate instead of removing, so the member's expense history
  // and household totals stay intact. Deactivated members can't log in and are
  // hidden from active member pickers.
  db.update(schema.users).set({ active: false }).where(eq(schema.users.id, id)).run()
  revokeAllForUser(id) // cut off any open sessions immediately
  return { ok: true }
})
