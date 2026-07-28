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

// Session lifetimes. "Remember me" keeps the household signed in for a month;
// without it the session dies after a day. The runtimeConfig maxAge must stay
// >= REMEMBER_MAX_AGE — it is the ceiling h3 applies when unsealing the cookie.
export const REMEMBER_MAX_AGE = 60 * 60 * 24 * 30 // 30 days
export const DEFAULT_MAX_AGE = 60 * 60 * 24 // 1 day

export function sessionMaxAge(remember: boolean | undefined) {
  return remember ? REMEMBER_MAX_AGE : DEFAULT_MAX_AGE
}

// Create a server-side session row and seal the cookie with its id (sid).
export async function createSession(event: H3Event, user: SessionUser, remember = false) {
  const id = randomUUID()
  const now = Date.now()
  const maxAge = sessionMaxAge(remember)
  await db.insert(schema.sessions).values({
    id,
    userId: user.id,
    userAgent: (getHeader(event, 'user-agent') || '').slice(0, 300),
    ip: getRequestIP(event, { xForwardedFor: true }) || '',
    createdAt: now,
    lastSeenAt: now,
    revokedAt: null,
    expiresAt: now + maxAge * 1000,
  })
  // h3 anchors both the cookie expiry and its own age check on the *h3 session's*
  // createdAt, which for a visitor carrying an anonymous cookie can be weeks old.
  // Seed a brand-new one so the month counts from this login, not from that visit.
  const name = useRuntimeConfig(event).session?.name || 'lar-session'
  event.context.sessions ||= Object.create(null)
  event.context.sessions[name] = { id: randomUUID(), createdAt: now, data: Object.create(null) }
  await setUserSession(event, { user, sid: id, remember }, { maxAge })
}

// Re-seal the cookie with fresh user data, keeping the same session id and the
// lifetime chosen at login (re-sealing with the default would shorten a
// remembered session to a day).
export async function refreshSessionUser(event: H3Event, user: SessionUser) {
  const current = await getUserSession(event) as { sid?: string, remember?: boolean }
  await setUserSession(event, { user, sid: current?.sid, remember: current?.remember }, {
    maxAge: sessionMaxAge(current?.remember),
  })
}

export async function revokeSession(id: string) {
  await db.update(schema.sessions).set({ revokedAt: Date.now() }).where(eq(schema.sessions.id, id))
}

export async function revokeAllForUser(userId: string) {
  await db.update(schema.sessions).set({ revokedAt: Date.now() })
    .where(and(eq(schema.sessions.userId, userId), isNull(schema.sessions.revokedAt)))
}
