import { eq, and, ne } from 'drizzle-orm'
import { z } from 'zod'
import { db, schema } from '../../utils/db'

const Body = z.object({
  name: z.string().trim().min(2).optional(),
  role: z.enum(['admin', 'user']).optional(),
  password: z.string().min(8).optional(),
})

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const id = getRouterParam(event, 'id')!
  const body = await readValidatedBody(event, Body.parse)

  const target = db.select().from(schema.users).where(eq(schema.users.id, id)).get()
  if (!target) throw createError({ statusCode: 404, statusMessage: 'Membro não encontrado' })

  // Guard: don't allow removing the last admin (e.g. self-demotion).
  if (body.role === 'user' && target.role === 'admin') {
    const otherAdmins = db.select().from(schema.users)
      .where(and(eq(schema.users.role, 'admin'), ne(schema.users.id, id))).all().length
    if (otherAdmins === 0) {
      throw createError({ statusCode: 400, statusMessage: 'Tem de existir pelo menos um administrador.' })
    }
  }

  const patch: Record<string, unknown> = {}
  if (body.name !== undefined) patch.name = body.name
  if (body.role !== undefined) patch.role = body.role
  if (body.password !== undefined) patch.passwordHash = await hashPassword(body.password)

  if (Object.keys(patch).length) db.update(schema.users).set(patch).where(eq(schema.users.id, id)).run()

  // Keep the session fresh if an admin edited their own record.
  if (admin.id === id && (body.name || body.role)) {
    const updated = db.select().from(schema.users).where(eq(schema.users.id, id)).get()!
    await setUserSession(event, { user: { id: updated.id, name: updated.name, email: updated.email, role: updated.role, hue: updated.hue } })
  }

  const updated = db.select().from(schema.users).where(eq(schema.users.id, id)).get()!
  const { passwordHash: _, ...safe } = updated
  return safe
})
