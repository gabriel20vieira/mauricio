import { eq } from 'drizzle-orm'
import { db, schema } from '../../utils/db'

// Revoke a session (terminate a device). A member may revoke their own sessions;
// an admin may revoke anyone's. Revoking the current session also clears the cookie.
export default defineEventHandler(async (event) => {
  const user = await requireDbUser(event)
  const id = getRouterParam(event, 'id')!

  const target = db.select().from(schema.sessions).where(eq(schema.sessions.id, id)).get()
  if (!target) throw createError({ statusCode: 404, statusMessage: 'Sessão não encontrada.' })
  if (user.role !== 'admin' && target.userId !== user.id) {
    throw createError({ statusCode: 403, statusMessage: 'Só pode terminar as suas sessões.' })
  }

  if (!target.revokedAt) {
    db.update(schema.sessions).set({ revokedAt: Date.now() }).where(eq(schema.sessions.id, id)).run()
  }

  const current = await getUserSession(event) as { sid?: string }
  if (current?.sid === id) await clearUserSession(event)

  return { ok: true }
})
