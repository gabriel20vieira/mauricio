import { eq } from 'drizzle-orm'
import { db, schema } from '../utils/db'

// Per-request session validation. With server-side session rows we can revoke a
// device or block a member and have it take effect on the very next request —
// including page loads, not just mutations.
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event) as { sid?: string, user?: { id: string } }
  const sid = session?.sid
  if (!sid) return // no authenticated session — nothing to validate

  const [row] = await db.select().from(schema.sessions).where(eq(schema.sessions.id, sid)).limit(1)
  const [user] = session.user
    ? await db.select().from(schema.users).where(eq(schema.users.id, session.user.id)).limit(1)
    : [null]

  // Revoked / unknown session, or deactivated member → drop the session.
  if (!row || row.revokedAt || !user || !user.active) {
    await clearUserSession(event)
    return
  }

  // Throttle last-seen writes to at most once per minute.
  if (Date.now() - row.lastSeenAt > 60_000) {
    await db.update(schema.sessions).set({ lastSeenAt: Date.now() }).where(eq(schema.sessions.id, sid))
  }
})
