import { eq, and, ne } from 'drizzle-orm'
import { z } from 'zod'
import { db, schema } from '../../utils/db'

const Body = z.object({
  name: z.string().trim().min(2).optional(),
  role: z.enum(['admin', 'user']).optional(),
  password: z.string().min(8).optional(),
  active: z.boolean().optional(), // false = block access, true = unblock
})

// Number of OTHER active admins (excludes the given id).
function otherActiveAdmins(id: string): number {
  return db.select().from(schema.users)
    .where(and(eq(schema.users.role, 'admin'), eq(schema.users.active, true), ne(schema.users.id, id))).all().length
}

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const id = getRouterParam(event, 'id')!
  const body = await readValidatedBody(event, Body.parse)

  const target = db.select().from(schema.users).where(eq(schema.users.id, id)).get()
  if (!target) throw createError({ statusCode: 404, statusMessage: 'Membro não encontrado' })

  // Guard: keep at least one active admin (demotion or blocking).
  const demoting = body.role === 'user' && target.role === 'admin'
  const blocking = body.active === false && target.active
  if ((demoting || blocking) && target.role === 'admin' && otherActiveAdmins(id) === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Tem de existir pelo menos um administrador ativo.' })
  }
  if (blocking && admin.id === id) {
    throw createError({ statusCode: 400, statusMessage: 'Não pode bloquear a sua própria conta.' })
  }

  const patch: Record<string, unknown> = {}
  if (body.name !== undefined) patch.name = body.name
  if (body.role !== undefined) patch.role = body.role
  if (body.password !== undefined) patch.passwordHash = await hashPassword(body.password)
  if (body.active !== undefined) patch.active = body.active

  if (Object.keys(patch).length) db.update(schema.users).set(patch).where(eq(schema.users.id, id)).run()

  // Blocking immediately revokes all of the member's open sessions.
  if (blocking) revokeAllForUser(id)

  // Keep the session fresh if an admin edited their own record.
  if (admin.id === id && (body.name || body.role)) {
    const updated = db.select().from(schema.users).where(eq(schema.users.id, id)).get()!
    await refreshSessionUser(event, toSessionUser(updated))
  }

  const updated = db.select().from(schema.users).where(eq(schema.users.id, id)).get()!
  const { passwordHash: _, ...safe } = updated
  return safe
})
