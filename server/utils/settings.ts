import { eq } from 'drizzle-orm'
import { db, schema } from './db'
import { NUM_CTX_DEFAULT, NUM_CTX_MIN, NUM_CTX_MAX } from '../../shared/config'

export const LOCALES = ['en-US', 'pt-PT', 'es-ES'] as const
export type Locale = typeof LOCALES[number]

export function isLocale(v: unknown): v is Locale {
  return typeof v === 'string' && (LOCALES as readonly string[]).includes(v)
}

export async function getSetting(key: string): Promise<string | null> {
  const [row] = await db.select().from(schema.settings).where(eq(schema.settings.key, key)).limit(1)
  return row?.value ?? null
}

export async function setSetting(key: string, value: string | null) {
  await db.insert(schema.settings).values({ key, value })
    .onDuplicateKeyUpdate({ set: { value } })
}

// Admin-forced locale for the whole app, or null = each user auto/preference.
export async function getForcedLocale(): Promise<Locale | null> {
  const v = await getSetting('forcedLocale')
  return isLocale(v) ? v : null
}

export interface AssistantConfig {
  enabled: boolean
  useCloud: boolean
  baseUrl: string
  model: string
  token: string
  numCtx: number
}

// Resolved assistant config: DB settings override env defaults. The token is only
// meaningful when useCloud is on.
export async function getAssistantConfig(): Promise<AssistantConfig> {
  const cfg = useRuntimeConfig()
  const [enabled, useCloud, baseUrl, model, token, numCtx] = await Promise.all([
    getSetting('assistant.enabled'),
    getSetting('assistant.useCloud'),
    getSetting('assistant.baseUrl'),
    getSetting('assistant.model'),
    getSetting('assistant.token'),
    getSetting('assistant.numCtx'),
  ])
  const ctx = Number(numCtx)
  return {
    enabled: enabled === null ? true : enabled === '1',
    useCloud: useCloud === '1',
    baseUrl: baseUrl || cfg.ollamaBaseUrl,
    model: model || cfg.ollamaModel,
    token: token || process.env.OLLAMA_TOKEN || '',
    numCtx: Number.isFinite(ctx) && ctx >= NUM_CTX_MIN && ctx <= NUM_CTX_MAX ? ctx : NUM_CTX_DEFAULT,
  }
}

export async function setAssistantConfig(c: Partial<AssistantConfig>) {
  if (c.enabled !== undefined) await setSetting('assistant.enabled', c.enabled ? '1' : '0')
  if (c.useCloud !== undefined) await setSetting('assistant.useCloud', c.useCloud ? '1' : '0')
  if (c.baseUrl !== undefined) await setSetting('assistant.baseUrl', c.baseUrl)
  if (c.model !== undefined) await setSetting('assistant.model', c.model)
  if (c.token !== undefined) await setSetting('assistant.token', c.token)
  if (c.numCtx !== undefined) await setSetting('assistant.numCtx', String(c.numCtx))
}
