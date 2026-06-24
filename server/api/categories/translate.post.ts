import { z } from 'zod'
import { ollamaComplete } from '../../utils/ollama'
import { getAssistantConfig } from '../../utils/settings'

const Body = z.object({
  names: z.object({ en: z.string().default(''), pt: z.string().default(''), es: z.string().default('') }),
})

// Fill the missing language names from the one(s) provided, using the LLM.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  if (!(await getAssistantConfig()).enabled) {
    throw createError({ statusCode: 400, statusMessage: 'O assistente está desativado.' })
  }
  const { names } = await readValidatedBody(event, Body.parse)
  const source = names.en || names.pt || names.es
  if (!source) throw createError({ statusCode: 400, statusMessage: 'Indique pelo menos um nome.' })

  const raw = await ollamaComplete([
    { role: 'system', content: 'You translate a short household expense category name. Reply with ONLY a JSON object {"en":"...","pt":"...","es":"..."} — American English, European Portuguese, European Spanish. Keep each 1-3 words, no explanation, no code fences.' },
    { role: 'user', content: source },
  ], { signal: AbortSignal.timeout(20_000) }).catch(() => '')

  const json = raw.replace(/```json|```/g, '').trim()
  let parsed: any = {}
  try { parsed = JSON.parse(json.slice(json.indexOf('{'), json.lastIndexOf('}') + 1)) } catch { /* ignore */ }

  // Keep any name the user already filled; fill the rest from the model.
  return {
    en: names.en || (typeof parsed.en === 'string' ? parsed.en.trim() : '') || source,
    pt: names.pt || (typeof parsed.pt === 'string' ? parsed.pt.trim() : '') || source,
    es: names.es || (typeof parsed.es === 'string' ? parsed.es.trim() : '') || source,
  }
})
