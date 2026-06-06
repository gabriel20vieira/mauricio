import type { H3Event } from 'h3'
import { and, eq } from 'drizzle-orm'
import { db, schema } from './db'
import type { ChatConversation } from '../db/schema'

/** Fetch a conversation by id, asserting it belongs to the session user. */
export async function requireConversation(event: H3Event, id: string): Promise<{ user: any, conversation: ChatConversation }> {
  const { user } = await requireUserSession(event)
  const conversation = db.select().from(schema.chatConversations)
    .where(and(eq(schema.chatConversations.id, id), eq(schema.chatConversations.userId, user.id)))
    .get()
  if (!conversation) throw createError({ statusCode: 404, statusMessage: 'Conversa não encontrada.' })
  return { user, conversation }
}
