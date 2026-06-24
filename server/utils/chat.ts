import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import { db, schema } from './db'
import type { ChatConversation } from '../db/schema'

/** Fetch a conversation by id. The owner can access it; admins can access anyone's. */
export async function requireConversation(event: H3Event, id: string): Promise<{ user: any, conversation: ChatConversation }> {
  const { user } = await requireUserSession(event)
  const [conversation] = await db.select().from(schema.chatConversations)
    .where(eq(schema.chatConversations.id, id)).limit(1)
  if (!conversation) throw createError({ statusCode: 404, statusMessage: 'Conversa não encontrada.' })
  if (conversation.userId !== user.id && user.role !== 'admin') {
    throw createError({ statusCode: 404, statusMessage: 'Conversa não encontrada.' })
  }
  return { user, conversation }
}
