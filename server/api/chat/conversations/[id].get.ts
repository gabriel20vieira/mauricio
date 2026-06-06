import { asc, eq } from 'drizzle-orm'
import { db, schema } from '../../../utils/db'
import { requireConversation } from '../../../utils/chat'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const { conversation } = await requireConversation(event, id)
  const rows = db.select().from(schema.chatMessages)
    .where(eq(schema.chatMessages.conversationId, id))
    .orderBy(asc(schema.chatMessages.createdAt))
    .all()
  // Only surface user/assistant turns to the UI (tool turns are internal).
  const messages = rows
    .filter(m => m.role !== 'tool')
    .map(m => ({
      id: m.id,
      role: m.role,
      content: m.content,
      cards: m.cards ? JSON.parse(m.cards) : [],
      createdAt: m.createdAt,
    }))
  return { conversation, messages }
})
