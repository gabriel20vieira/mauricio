import { and, desc, eq, isNull } from 'drizzle-orm'
import { db, schema } from '../../utils/db'

// Lists active sessions. A member sees their own; an admin can pass ?all=1 to see
// everyone's (with the member's name), to manage devices and access centrally.
export default defineEventHandler(async (event) => {
  const user = await requireDbUser(event)
  const current = await getUserSession(event) as { sid?: string }
  const all = getQuery(event).all && user.role === 'admin'

  const where = all
    ? isNull(schema.sessions.revokedAt)
    : and(eq(schema.sessions.userId, user.id), isNull(schema.sessions.revokedAt))

  const rows = await db.select().from(schema.sessions).where(where).orderBy(desc(schema.sessions.lastSeenAt))
  const names = all ? Object.fromEntries((await db.select().from(schema.users)).map(u => [u.id, u.name])) : {}

  return rows.map(s => ({
    id: s.id,
    userId: s.userId,
    userName: all ? (names[s.userId] || '—') : undefined,
    userAgent: s.userAgent,
    ip: s.ip,
    createdAt: s.createdAt,
    lastSeenAt: s.lastSeenAt,
    current: s.id === current?.sid,
  }))
})
