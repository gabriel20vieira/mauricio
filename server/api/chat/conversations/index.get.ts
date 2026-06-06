import { and, desc, eq } from 'drizzle-orm'
import { db, schema } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  return db.select({
    id: schema.chatConversations.id,
    title: schema.chatConversations.title,
    createdAt: schema.chatConversations.createdAt,
    updatedAt: schema.chatConversations.updatedAt,
  })
    .from(schema.chatConversations)
    .where(eq(schema.chatConversations.userId, user.id))
    .orderBy(desc(schema.chatConversations.updatedAt))
    .all()
})
