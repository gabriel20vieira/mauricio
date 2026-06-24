import { eq } from 'drizzle-orm'
import { db, schema } from '../../utils/db'
import { getForcedLocale } from '../../utils/settings'

// Locale resolution inputs for the client: admin-forced locale (global) and the
// logged-in user's preference. Precedence (forced > user > browser > en) is applied
// on the client. Public — works before login (returns only the forced locale then).
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event) as { user?: { id: string } }
  let userLocale: string | null = null
  if (session?.user?.id) {
    const [u] = await db.select().from(schema.users).where(eq(schema.users.id, session.user.id)).limit(1)
    userLocale = u?.locale ?? null
  }
  return { forced: await getForcedLocale(), userLocale }
})
