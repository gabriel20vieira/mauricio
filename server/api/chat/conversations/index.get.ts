import { desc, eq } from 'drizzle-orm'
import { db, schema } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const all = getQuery(event).all && user.role === 'admin'

  const rows = db.select().from(schema.chatConversations)
    .where(all ? undefined : eq(schema.chatConversations.userId, user.id))
    .orderBy(desc(schema.chatConversations.updatedAt))
    .all()

  const names = all ? Object.fromEntries(db.select().from(schema.users).all().map(u => [u.id, u.name])) : {}
  return rows.map(c => ({
    id: c.id, title: c.title, userId: c.userId, createdAt: c.createdAt, updatedAt: c.updatedAt,
    userName: all ? (names[c.userId] || '—') : undefined,
  }))
})
