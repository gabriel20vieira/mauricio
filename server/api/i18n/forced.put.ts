import { z } from 'zod'
import { setSetting, isLocale } from '../../utils/settings'

const Body = z.object({ locale: z.string().nullable() })

// Admin sets (or clears) the app-wide forced locale.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { locale } = await readValidatedBody(event, Body.parse)
  if (locale !== null && !isLocale(locale)) {
    throw createError({ statusCode: 400, statusMessage: 'Língua inválida.' })
  }
  setSetting('forcedLocale', locale)
  return { ok: true, forced: locale }
})
