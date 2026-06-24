import { db, schema } from '../../utils/db'

// Any authenticated member can see the household roster (needed across screens).
export default defineEventHandler(async (event) => {
  await requireUserSession(event)
  const rows = await db.select().from(schema.users)
  // Never leak password hashes.
  return rows.map(({ passwordHash, ...u }) => u)
})
