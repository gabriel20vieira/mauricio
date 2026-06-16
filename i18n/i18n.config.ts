// vue-i18n runtime config: fallback + locale-aware number/date formats.
const currency = { style: 'currency', currency: 'EUR' } as const
const currency0 = { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 } as const
const short = { day: '2-digit', month: 'short' } as const
const long = { day: '2-digit', month: 'short', year: 'numeric' } as const
const monthYear = { month: 'long', year: 'numeric' } as const

const numberFormats = { currency, currency0 }
const datetimeFormats = { short, long, monthYear }

export default defineI18nConfig(() => ({
  legacy: false,
  fallbackLocale: 'en-US',
  numberFormats: {
    'en-US': numberFormats,
    'pt-PT': numberFormats,
    'es-ES': numberFormats,
  },
  datetimeFormats: {
    'en-US': datetimeFormats,
    'pt-PT': datetimeFormats,
    'es-ES': datetimeFormats,
  },
}))
