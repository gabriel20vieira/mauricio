import { randomUUID } from 'node:crypto'
import { db, schema } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const user = await requireDbUser(event)
  const now = Date.now()
  const row = { id: randomUUID(), userId: user.id, title: 'Nova conversa', createdAt: now, updatedAt: now }
  db.insert(schema.chatConversations).values(row).run()
  return row
})
