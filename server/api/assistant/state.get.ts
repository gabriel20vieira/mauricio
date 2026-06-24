import { getAssistantConfig } from '../../utils/settings'

// Lightweight, any authenticated user — tells the client whether to show the
// assistant in the nav and allow the page.
export default defineEventHandler(async (event) => {
  await requireUserSession(event)
  return { enabled: (await getAssistantConfig()).enabled }
})
