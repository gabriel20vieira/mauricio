import { eq } from 'drizzle-orm'
import { db, schema } from './db'

export const LOCALES = ['en-US', 'pt-PT', 'es-ES'] as const
export type Locale = typeof LOCALES[number]

export function isLocale(v: unknown): v is Locale {
  return typeof v === 'string' && (LOCALES as readonly string[]).includes(v)
}

export function getSetting(key: string): string | null {
  return db.select().from(schema.settings).where(eq(schema.settings.key, key)).get()?.value ?? null
}

export function setSetting(key: string, value: string | null) {
  db.insert(schema.settings).values({ key, value })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value } }).run()
}

// Admin-forced locale for the whole app, or null = each user auto/preference.
export function getForcedLocale(): Locale | null {
  const v = getSetting('forcedLocale')
  return isLocale(v) ? v : null
}

export interface AssistantConfig {
  enabled: boolean
  useCloud: boolean
  baseUrl: string
  model: string
  token: string
}

// Resolved assistant config: DB settings override env defaults. The token is only
// meaningful when useCloud is on.
export function getAssistantConfig(): AssistantConfig {
  const cfg = useRuntimeConfig()
  const enabled = getSetting('assistant.enabled')
  const useCloud = getSetting('assistant.useCloud')
  return {
    enabled: enabled === null ? true : enabled === '1',
    useCloud: useCloud === '1',
    baseUrl: getSetting('assistant.baseUrl') || cfg.ollamaBaseUrl,
    model: getSetting('assistant.model') || cfg.ollamaModel,
    token: getSetting('assistant.token') || process.env.OLLAMA_TOKEN || '',
  }
}

export function setAssistantConfig(c: Partial<AssistantConfig>) {
  if (c.enabled !== undefined) setSetting('assistant.enabled', c.enabled ? '1' : '0')
  if (c.useCloud !== undefined) setSetting('assistant.useCloud', c.useCloud ? '1' : '0')
  if (c.baseUrl !== undefined) setSetting('assistant.baseUrl', c.baseUrl)
  if (c.model !== undefined) setSetting('assistant.model', c.model)
  if (c.token !== undefined) setSetting('assistant.token', c.token)
}
