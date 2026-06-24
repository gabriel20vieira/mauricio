import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { db, userCount, schema } from '../../utils/db'

const Body = z.object({
  name: z.string().trim().min(2, 'Nome demasiado curto'),
  email: z.string().trim().email('Email inválido'),
  password: z.string().min(8, 'Password deve ter pelo menos 8 caracteres'),
})

// First-run only: creates the household's first administrator.
export default defineEventHandler(async (event) => {
  rateLimit(event, { key: 'setup', limit: 5, windowMs: 10 * 60_000 })
  if (await userCount() > 0) {
    throw createError({ statusCode: 403, statusMessage: 'Já existe uma conta. O registo é feito por um administrador.' })
  }

  const body = await readValidatedBody(event, Body.parse)
  const passwordHash = await hashPassword(body.password)
  // Re-check after the async hashing to close the TOCTOU window — only the very
  // first request on an empty DB may create the admin.
  if (await userCount() > 0) {
    throw createError({ statusCode: 403, statusMessage: 'Já existe uma conta. O registo é feito por um administrador.' })
  }
  const user = {
    id: randomUUID(),
    name: body.name,
    email: body.email.toLowerCase(),
    passwordHash,
    role: 'admin' as const,
    hue: 245,
    createdAt: Date.now(),
  }
  await db.insert(schema.users).values(user)

  await createSession(event, toSessionUser(user as any))
  return { ok: true }
})
