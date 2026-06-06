import type { H3Event } from 'h3'

export async function requireAdmin(event: H3Event) {
  const { user } = await requireUserSession(event)
  if (user.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Apenas administradores.' })
  }
  return user
}
