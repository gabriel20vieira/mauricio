import { z } from 'zod'
import { anthropicModels } from '../../utils/anthropic'
import { getAssistantConfig } from '../../utils/settings'

// Lists the Anthropic models a key can use. Takes the key from the form (so the
// admin can load models before saving) and falls back to the stored one.
const Body = z.object({ apiKey: z.string().trim().optional() })

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { apiKey } = await readValidatedBody(event, Body.parse)
  return await anthropicModels(apiKey || (await getAssistantConfig()).anthropicKey)
})
