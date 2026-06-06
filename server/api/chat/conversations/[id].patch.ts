import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, schema } from '../../../utils/db'
import { requireConversation } from '../../../utils/chat'

const Body = z.object({ title: z.string().min(1).max(120) })

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  await requireConversation(event, id)
  const { title } = await readValidatedBody(event, Body.parse)
  db.update(schema.chatConversations).set({ title, updatedAt: Date.now() }).where(eq(schema.chatConversations.id, id)).run()
  return { ok: true }
})
