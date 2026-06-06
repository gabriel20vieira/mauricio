import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, schema } from '../../utils/db'
import { MEMBER_HUES } from '../../../shared/config'

const Body = z.object({
  name: z.string().trim().min(2, 'Nome demasiado curto'),
  email: z.string().trim().email('Email inválido'),
  password: z.string().min(8, 'Password deve ter pelo menos 8 caracteres'),
  role: z.enum(['admin', 'user']).default('user'),
})

// Admin-only member registration. This is the ONLY way to add users after setup.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readValidatedBody(event, Body.parse)
  const email = body.email.toLowerCase()

  const dup = db.select().from(schema.users).where(eq(schema.users.email, email)).get()
  if (dup) throw createError({ statusCode: 409, statusMessage: 'Já existe um membro com esse email.' })

  const count = db.select().from(schema.users).all().length
  const passwordHash = await hashPassword(body.password)
  const user = {
    id: randomUUID(),
    name: body.name,
    email,
    passwordHash,
    role: body.role,
    hue: MEMBER_HUES[count % MEMBER_HUES.length],
    createdAt: Date.now(),
  }
  db.insert(schema.users).values(user).run()
  const { passwordHash: _, ...safe } = user
  return safe
})
