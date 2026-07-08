import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, schema } from '../../utils/db'
import { broadcastMemberUpsert } from '../../utils/realtime'
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

  const [dup] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1)
  if (dup && dup.active) throw createError({ statusCode: 409, statusMessage: 'Já existe um membro com esse email.' })

  const passwordHash = await hashPassword(body.password)

  // Re-adding a previously deactivated email reactivates that member (keeps history).
  if (dup && !dup.active) {
    await db.update(schema.users).set({ name: body.name, role: body.role, passwordHash, active: true })
      .where(eq(schema.users.id, dup.id))
    const reactivated = { id: dup.id, name: body.name, email, role: body.role, hue: dup.hue, active: true, createdAt: dup.createdAt }
    broadcastMemberUpsert(reactivated)
    return reactivated
  }

  const count = (await db.select().from(schema.users)).length
  const user = {
    id: randomUUID(),
    name: body.name,
    email,
    passwordHash,
    role: body.role,
    hue: MEMBER_HUES[count % MEMBER_HUES.length],
    active: true,
    createdAt: Date.now(),
  }
  await db.insert(schema.users).values(user)
  const { passwordHash: _, ...safe } = user
  broadcastMemberUpsert(safe)
  return safe
})
