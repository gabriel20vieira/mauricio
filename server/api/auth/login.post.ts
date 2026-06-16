import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, schema } from '../../utils/db'

const Body = z.object({
  email: z.string().trim().email('Email inválido'),
  password: z.string().min(1, 'Indique a password'),
})

export default defineEventHandler(async (event) => {
  // Throttle to blunt brute-force / credential stuffing.
  rateLimit(event, { key: 'login', limit: 8, windowMs: 5 * 60_000 })
  const body = await readValidatedBody(event, Body.parse)
  const email = body.email.toLowerCase()

  const user = db.select().from(schema.users).where(eq(schema.users.email, email)).get()
  const ok = user && (await verifyPassword(user.passwordHash, body.password))
  if (!user || !ok) {
    throw createError({ statusCode: 401, statusMessage: 'Email ou password incorretos' })
  }
  // Deactivated members cannot authenticate.
  if (!user.active) {
    throw createError({ statusCode: 403, statusMessage: 'Conta desativada. Contacte um administrador.' })
  }

  await createSession(event, toSessionUser(user))
  return { ok: true }
})
