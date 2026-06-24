import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import { db, schema } from './db'
import type { User } from '../db/schema'

/**
 * Like requireUserSession, but also verifies the session user still exists in the
 * database and returns the fresh row. Guards against a stale session whose user was
 * deleted (or a dev DB reset) — turns a confusing FK 500 into a clean 401.
 */
export async function requireDbUser(event: H3Event): Promise<User> {
  const { user } = await requireUserSession(event)
  const [row] = await db.select().from(schema.users).where(eq(schema.users.id, user.id)).limit(1)
  if (!row || !row.active) {
    await clearUserSession(event)
    throw createError({ statusCode: 401, statusMessage: 'Sessão inválida. Inicie sessão novamente.' })
  }
  return row
}

export async function requireAdmin(event: H3Event) {
  const user = await requireDbUser(event)
  if (user.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Apenas administradores.' })
  }
  return user
}
