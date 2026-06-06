import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, schema } from '../utils/db'

const Body = z.object({
  name: z.string().trim().min(2).optional(),
  password: z.string().min(8).optional(),
})

// A member updates their own name / password.
export default defineEventHandler(async (event) => {
  const user = await requireDbUser(event)
  const body = await readValidatedBody(event, Body.parse)

  const patch: Record<string, unknown> = {}
  if (body.name !== undefined) patch.name = body.name
  if (body.password !== undefined) patch.passwordHash = await hashPassword(body.password)
  if (Object.keys(patch).length) db.update(schema.users).set(patch).where(eq(schema.users.id, user.id)).run()

  const updated = db.select().from(schema.users).where(eq(schema.users.id, user.id)).get()!
  await setUserSession(event, { user: { id: updated.id, name: updated.name, email: updated.email, role: updated.role, hue: updated.hue } })
  const { passwordHash: _, ...safe } = updated
  return safe
})
