import { getAssistantConfig } from '../../utils/settings'

// Admin reads the full assistant config (incl. token) for editing.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return await getAssistantConfig()
})
