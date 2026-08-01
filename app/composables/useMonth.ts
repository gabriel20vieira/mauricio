import { monthKey } from '~~/shared/config'

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/

function parseMonth(v: unknown): string | null {
  const raw = Array.isArray(v) ? v[0] : v
  return typeof raw === 'string' && MONTH_RE.test(raw) ? raw : null
}

/**
 * The month/year selection shared by every page (dashboard, movements,
 * reports). Backed by useState so it survives client-side navigation, and
 * mirrored into the `?m=yyyy-mm` query so a page can be linked or bookmarked
 * on a given month.
 */
export function useMonth() {
  // Default to the current month so SSR has a valid yyyy-mm before data loads
  // (empty string → Invalid Date → i18n datetime throws in production SSR).
  const selected = useState<string>('selected-month', () => monthKey(new Date().toISOString().slice(0, 10)))
  const route = useRoute()
  const router = useRouter()

  // An explicit ?m= wins over the carried-over selection: a pasted or
  // bookmarked URL must open on the month it names.
  const fromUrl = parseMonth(route.query.m)
  if (fromUrl) selected.value = fromUrl

  onMounted(() => {
    const writeUrl = () => {
      if (route.query.m === selected.value) return
      // replace(), not push(): stepping months should not pile up history.
      void router.replace({ query: { ...route.query, m: selected.value } })
    }
    writeUrl()
    watch(selected, writeUrl)
    // Follow back/forward and hand-edited URLs.
    watch(() => route.query.m, (q) => {
      const v = parseMonth(q)
      if (v && v !== selected.value) selected.value = v
    })
  })

  return selected
}
