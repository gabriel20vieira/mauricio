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
