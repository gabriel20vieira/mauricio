import { asc, eq } from 'drizzle-orm'
import { db, schema } from '../../../utils/db'
import { requireConversation } from '../../../utils/chat'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const { conversation } = await requireConversation(event, id)
  const rows = await db.select().from(schema.chatMessages)
    .where(eq(schema.chatMessages.conversationId, id))
    .orderBy(asc(schema.chatMessages.createdAt))
  const messages: any[] = []
  for (const m of rows) {
    if (m.role === 'user') {
      messages.push({ id: m.id, role: 'user', content: m.content, createdAt: m.createdAt })
    } else if (m.role === 'assistant') {
      if (m.segments) {
        messages.push({ id: m.id, role: 'assistant', segments: JSON.parse(m.segments), createdAt: m.createdAt })
      } else if (m.content || m.cards) {
        // Backward-compat for responses stored before segments existed.
        const segs: any[] = []
        if (m.content) segs.push({ type: 'text', text: m.content })
        if (m.cards) for (const card of JSON.parse(m.cards)) segs.push({ type: 'card', card })
        if (segs.length) messages.push({ id: m.id, role: 'assistant', segments: segs, createdAt: m.createdAt })
      }
    }
    // tool rows are internal — skipped
  }
  return { conversation, messages }
})
