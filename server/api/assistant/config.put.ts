import { z } from 'zod'
import { setAssistantConfig } from '../../utils/settings'

const Body = z.object({
  enabled: z.boolean().optional(),
  useCloud: z.boolean().optional(),
  baseUrl: z.string().trim().optional(),
  model: z.string().trim().optional(),
  token: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readValidatedBody(event, Body.parse)
  await setAssistantConfig(body)
  return { ok: true }
})
