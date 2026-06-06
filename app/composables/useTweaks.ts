import { computed } from 'vue'

export interface Tweaks {
  theme: 'light' | 'dark'
  density: 'compact' | 'regular' | 'comfy'
  accent: number // hue
  radius: number // px
}

const DEFAULTS: Tweaks = { theme: 'light', density: 'regular', accent: 165, radius: 14 }
const KEY = 'lar.tweaks'

function load(): Tweaks {
  if (import.meta.client) {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) return { ...DEFAULTS, ...JSON.parse(raw) }
    } catch { /* ignore */ }
  }
  return { ...DEFAULTS }
}

export function useTweaks() {
  const state = useState<Tweaks>('tweaks', () => load())

  function apply(t: Tweaks) {
    if (!import.meta.client) return
    const el = document.documentElement
    el.setAttribute('data-theme', t.theme)
    el.setAttribute('data-density', t.density)
    el.style.setProperty('--accent-h', String(t.accent))
    el.style.setProperty('--radius', `${t.radius}px`)
    el.style.setProperty('--radius-sm', `${Math.max(4, t.radius - 5)}px`)
    localStorage.setItem(KEY, JSON.stringify(t))
  }

  function set(patch: Partial<Tweaks>) {
    state.value = { ...state.value, ...patch }
    apply(state.value)
  }

  function toggleTheme() {
    set({ theme: state.value.theme === 'dark' ? 'light' : 'dark' })
  }

  const isDark = computed(() => state.value.theme === 'dark')

  return { tweaks: state, set, toggleTheme, isDark, apply }
}
