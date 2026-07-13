import { asc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, schema } from '../../../utils/db'
import { requireConversation } from '../../../utils/chat'

// Persist that a confirm-card was acted upon, so it doesn't re-appear as actionable
// when the conversation is reopened. Keyed by conversationId + cardId (the stable id
// baked into the card server-side). Marks the matching segment as confirmed.
const Body = z.object({
  conversationId: z.string().min(1),
  cardId: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  const { conversationId, cardId } = await readValidatedBody(event, Body.parse)
  await requireConversation(event, conversationId) // owner or admin

  const rows = await db.select().from(schema.chatMessages)
    .where(eq(schema.chatMessages.conversationId, conversationId))
    .orderBy(asc(schema.chatMessages.createdAt))

  for (const m of rows) {
    if (m.role !== 'assistant' || !m.segments) continue
    let segs: any[]
    try { segs = JSON.parse(m.segments) } catch { continue }
    let hit = false
    for (const s of segs) {
      if (s?.type === 'card' && s.card?.kind === 'confirm' && s.card.id === cardId) { s.confirmed = true; hit = true }
    }
    if (hit) {
      await db.update(schema.chatMessages).set({ segments: JSON.stringify(segs) })
        .where(eq(schema.chatMessages.id, m.id))
      return { ok: true }
    }
  }
  return { ok: false } // card not found (already gone / never persisted) — harmless
})
