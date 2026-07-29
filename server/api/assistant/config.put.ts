import { z } from 'zod'
import { setAssistantConfig } from '../../utils/settings'
import { NUM_CTX_MIN, NUM_CTX_MAX } from '../../../shared/config'

const Body = z.object({
  enabled: z.boolean().optional(),
  useCloud: z.boolean().optional(),
  baseUrl: z.string().trim().optional(),
  model: z.string().trim().optional(),
  token: z.string().optional(),
  // Coerced: the admin form sends it as a string from a text input.
  numCtx: z.coerce.number().int().min(NUM_CTX_MIN).max(NUM_CTX_MAX).optional(),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readValidatedBody(event, Body.parse)
  await setAssistantConfig(body)
  return { ok: true }
})
