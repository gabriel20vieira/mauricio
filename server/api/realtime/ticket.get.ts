import { issueTicket } from '../../utils/realtime'

// Mint a short-lived one-time ticket the client uses to authenticate the WS
// connection. Requires a valid, active session.
export default defineEventHandler(async (event) => {
  const user = await requireDbUser(event)
  return { ticket: issueTicket(user.id) }
})
