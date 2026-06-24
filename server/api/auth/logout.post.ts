export default defineEventHandler(async (event) => {
  const session = await getUserSession(event) as { sid?: string }
  if (session?.sid) await revokeSession(session.sid)
  await clearUserSession(event)
  return { ok: true }
})
