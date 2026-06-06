import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, schema } from '../../utils/db'

const Body = z.object({
  email: z.string().trim().email('Email inválido'),
  password: z.string().min(1, 'Indique a password'),
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, Body.parse)
  const email = body.email.toLowerCase()

  const user = db.select().from(schema.users).where(eq(schema.users.email, email)).get()
  const ok = user && (await verifyPassword(user.passwordHash, body.password))
  if (!user || !ok) {
    throw createError({ statusCode: 401, statusMessage: 'Email ou password incorretos' })
  }

  await setUserSession(event, {
    user: { id: user.id, name: user.name, email: user.email, role: user.role, hue: user.hue },
  })
  return { ok: true }
})
