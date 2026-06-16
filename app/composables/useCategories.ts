import type { CategoryT, SubcategoryT } from '~/composables/useStore'

// Client-side category/subcategory access with locale-aware names. Replaces the
// old static CATEGORIES constant in components.
export function useCategories() {
  const store = useStore()
  const { locale } = useI18n()
  const key = computed<'en' | 'pt' | 'es'>(() =>
    locale.value.startsWith('pt') ? 'pt' : locale.value.startsWith('es') ? 'es' : 'en')

  const all = computed<CategoryT[]>(() => store.categories.value)
  const active = computed<CategoryT[]>(() => all.value.filter(c => c.active))
  const byId = computed<Record<string, CategoryT>>(() => Object.fromEntries(all.value.map(c => [c.id, c])))

  function name(names: { en: string, pt: string, es: string } | undefined, fallback: string) {
    if (!names) return fallback
    return names[key.value] || names.en || names.pt || names.es || fallback
  }
  function catLabel(catId: string): string {
    return name(byId.value[catId]?.names, catId)
  }
  function activeSubs(catId: string): SubcategoryT[] {
    return (byId.value[catId]?.subs || []).filter(s => s.active)
  }
  function subLabel(catId: string, subId: string): string {
    if (!subId) return ''
    const s = byId.value[catId]?.subs.find(x => x.id === subId)
    return s ? name(s.names, subId) : subId
  }
  function hue(catId: string): number {
    return byId.value[catId]?.hue ?? 200
  }

  return { all, active, byId, key, catLabel, subLabel, activeSubs, hue }
}
