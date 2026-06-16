import { randomUUID } from 'node:crypto'
import type { H3Event } from 'h3'
import { and, eq, isNull } from 'drizzle-orm'
import { db, schema } from './db'
import type { User } from '../db/schema'

// The user fields embedded in the sealed cookie.
export interface SessionUser {
  id: string
  name: string
  email: string
  role: 'admin' | 'user'
  hue: number
}

export function toSessionUser(u: User): SessionUser {
  return { id: u.id, name: u.name, email: u.email, role: u.role, hue: u.hue }
}

// Create a server-side session row and seal the cookie with its id (sid).
export async function createSession(event: H3Event, user: SessionUser) {
  const id = randomUUID()
  const now = Date.now()
  db.insert(schema.sessions).values({
    id,
    userId: user.id,
    userAgent: (getHeader(event, 'user-agent') || '').slice(0, 300),
    ip: getRequestIP(event, { xForwardedFor: true }) || '',
    createdAt: now,
    lastSeenAt: now,
    revokedAt: null,
  }).run()
  await setUserSession(event, { user, sid: id })
}

// Re-seal the cookie with fresh user data, keeping the same session id.
export async function refreshSessionUser(event: H3Event, user: SessionUser) {
  const current = await getUserSession(event) as { sid?: string }
  await setUserSession(event, { user, sid: current?.sid })
}

export function revokeSession(id: string) {
  db.update(schema.sessions).set({ revokedAt: Date.now() }).where(eq(schema.sessions.id, id)).run()
}

export function revokeAllForUser(userId: string) {
  db.update(schema.sessions).set({ revokedAt: Date.now() })
    .where(and(eq(schema.sessions.userId, userId), isNull(schema.sessions.revokedAt))).run()
}
