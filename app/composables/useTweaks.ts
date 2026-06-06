import { computed } from 'vue'

export type Theme = 'light' | 'dark'

const KEY = 'lar.theme'

// Density, accent and corners are fixed by design (regular / green hue 165 / 14px),
// set via CSS defaults + htmlAttrs. Only the light/dark theme is user-choosable.
export function useTweaks() {
  const theme = useState<Theme>('theme', () => 'light')

  function apply(t: Theme) {
    if (!import.meta.client) return
    document.documentElement.setAttribute('data-theme', t)
    try { localStorage.setItem(KEY, t) } catch { /* ignore */ }
  }

  function setTheme(t: Theme) {
    theme.value = t
    apply(t)
  }

  function toggleTheme() {
    setTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  // Reconcile state with localStorage after hydration (useState hydrates from the
  // server payload, which can't see localStorage — so read it here on the client).
  function hydrate() {
    if (!import.meta.client) return
    let saved: string | null = null
    try { saved = localStorage.getItem(KEY) } catch { /* ignore */ }
    if (saved === 'light' || saved === 'dark') theme.value = saved
    apply(theme.value)
  }

  const isDark = computed(() => theme.value === 'dark')

  return { theme, setTheme, toggleTheme, isDark, apply, hydrate }
}
