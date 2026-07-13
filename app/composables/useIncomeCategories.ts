import type { IncomeCategoryT } from '~/composables/useStore'

// Client-side income-category access with locale-aware names. Flat (no subcategories).
// Mirrors the reduced surface of useCategories.
export function useIncomeCategories() {
  const store = useStore()
  const { locale } = useI18n()
  const key = computed<'en' | 'pt' | 'es'>(() =>
    locale.value.startsWith('pt') ? 'pt' : locale.value.startsWith('es') ? 'es' : 'en')

  const all = computed<IncomeCategoryT[]>(() => store.incomeCategories.value)
  const active = computed<IncomeCategoryT[]>(() => all.value.filter(c => c.active))
  const byId = computed<Record<string, IncomeCategoryT>>(() => Object.fromEntries(all.value.map(c => [c.id, c])))

  function name(names: { en: string, pt: string, es: string } | undefined, fallback: string) {
    if (!names) return fallback
    return names[key.value] || names.en || names.pt || names.es || fallback
  }
  function catLabel(catId: string): string {
    return name(byId.value[catId]?.names, catId)
  }
  function hue(catId: string): number {
    return byId.value[catId]?.hue ?? 155
  }

  return { all, active, byId, key, catLabel, hue }
}
