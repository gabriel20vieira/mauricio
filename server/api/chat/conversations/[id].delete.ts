import { eq } from 'drizzle-orm'
import { db, schema } from '../../../utils/db'
import { requireConversation } from '../../../utils/chat'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  await requireConversation(event, id)
  // chat_messages cascade via FK.
  db.delete(schema.chatConversations).where(eq(schema.chatConversations.id, id)).run()
  return { ok: true }
})
