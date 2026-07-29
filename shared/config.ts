// Shared domain config + formatting — ported from the design bundle's data.jsx.

export const MONTHS_PT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
export const MONTHS_PT_LONG = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

const fmtEUR = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' })
const fmtEUR0 = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
export function euro(n: number) { return fmtEUR.format(n || 0) }
export function euro0(n: number) { return fmtEUR0.format(n || 0) }

// Max characters for one chat message. Bounded by the MySQL TEXT column that stores
// it (65535 BYTES) — 16000 chars is safe even if every char is 4-byte UTF-8.
export const CHAT_MAX_CHARS = 16000

// Context window (tokens) for a SELF-HOSTED Ollama. Ollama's own default is 4096 —
// too small for our system prompt + history + tool results, and it truncates in
// silence. Not sent when the cloud toggle is on (that service sizes its own).
export const NUM_CTX_DEFAULT = 16384
export const NUM_CTX_MIN = 2048
export const NUM_CTX_MAX = 131072

// An expense's `sub` is meant to hold a subcategory id, but rows written before ids
// existed — and the chat assistant, whose tool takes free text — have also stored
// display labels and mixed casing. Nothing on the write path enforces it. Fold any of
// those onto the canonical id so a breakdown groups them into one row instead of
// several that merely look alike. Unmatched values fall back to lowercase, which at
// least merges "Casa" with "casa".
export function canonicalSubKey(raw: string, subs: { id: string, names: string[] }[]): string {
  const s = (raw || '').trim()
  if (!s) return ''
  const lower = s.toLowerCase()
  const hit = subs.find(x => x.id.toLowerCase() === lower)
    || subs.find(x => x.names.some(n => n && n.trim().toLowerCase() === lower))
  return hit ? hit.id : lower
}

export function parseDate(s: string) { const [y, m, d] = s.split('-').map(Number); return { y, m: m - 1, d } }
export function monthKey(s: string) { const p = parseDate(s); return `${p.y}-${String(p.m + 1).padStart(2, '0')}` }
// Step a 'yyyy-mm' month key by `delta` months, rolling the year over as needed.
export function stepMonth(mk: string, delta: number): string {
  const [y, m] = mk.split('-').map(Number)
  const d = new Date(y, (m - 1) + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
export function fmtDate(s: string) { const p = parseDate(s); return `${String(p.d).padStart(2, '0')} ${MONTHS_PT[p.m]} ${p.y}` }
export function fmtDateShort(s: string) { const p = parseDate(s); return `${String(p.d).padStart(2, '0')} ${MONTHS_PT[p.m]}` }

export interface Category { id: string; label: string; hue: number; subs: string[] }
export const CATEGORIES: Category[] = [
  { id: 'alimentacao', label: 'Alimentação', hue: 45, subs: ['Casa', 'Fora'] },
  { id: 'transportes', label: 'Transportes', hue: 245, subs: ['Carro', 'Públicos'] },
  { id: 'casa', label: 'Casa', hue: 155, subs: ['Renda', 'Manutenção'] },
  { id: 'utilidades', label: 'Água/Luz/Gás', hue: 205, subs: ['Água', 'Luz', 'Gás'] },
  { id: 'lazer', label: 'Lazer', hue: 305, subs: [] },
  { id: 'higiene', label: 'Higiene', hue: 345, subs: [] },
  { id: 'reparacoes', label: 'Reparações', hue: 25, subs: ['Casa', 'Carros'] },
]
export const CAT_BY_ID: Record<string, Category> = Object.fromEntries(CATEGORIES.map(c => [c.id, c]))

export const METHODS = ['Cartão', 'MB Way', 'Débito', 'Transferência', 'Dinheiro']

export function catColor(hue: number, dark: boolean) {
  return dark ? `oklch(0.72 0.12 ${hue})` : `oklch(0.60 0.13 ${hue})`
}
export function catSoft(hue: number, dark: boolean) {
  return dark ? `oklch(0.34 0.045 ${hue})` : `oklch(0.94 0.035 ${hue})`
}

// Curated category color palette for the admin picker (a swatch grid instead of a
// raw hue slider). Rows are hue families; columns are tonal-ish variants. Colours
// are hue-only (see catColor), so each swatch is just a hue value.
export const CATEGORY_PALETTE: number[][] = [
  [15, 25, 35], // reds
  [45, 60, 75], // amber / yellow
  [130, 150, 165], // greens
  [175, 190, 205], // teal / cyan
  [220, 235, 250], // blues
  [265, 285, 300], // violet
  [320, 335, 350], // pink / magenta
]

// Friendly device label from a User-Agent string (best-effort).
export function deviceLabel(ua: string): string {
  if (!ua) return 'Dispositivo desconhecido'
  const browser = /Edg/.test(ua) ? 'Edge'
    : /OPR|Opera/.test(ua) ? 'Opera'
      : /Chrome/.test(ua) ? 'Chrome'
        : /Firefox/.test(ua) ? 'Firefox'
          : /Safari/.test(ua) ? 'Safari' : 'Navegador'
  const os = /Windows/.test(ua) ? 'Windows'
    : /Android/.test(ua) ? 'Android'
      : /iPhone|iPad|iOS/.test(ua) ? 'iOS'
        : /Mac OS X|Macintosh/.test(ua) ? 'macOS'
          : /Linux/.test(ua) ? 'Linux' : '—'
  return `${browser} · ${os}`
}

// Locale-aware relative time label, e.g. "5 minutes ago" / "há 5 minutos".
export function relativeTime(ts: number, locale = 'en-US'): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000))
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  if (s < 60) return rtf.format(-s, 'second')
  const m = Math.floor(s / 60)
  if (m < 60) return rtf.format(-m, 'minute')
  const h = Math.floor(m / 60)
  if (h < 24) return rtf.format(-h, 'hour')
  return rtf.format(-Math.floor(h / 24), 'day')
}

export function initials(name: string) { return name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase() }
export function firstName(name: string) { return name.split(' ')[0] }

// Avatar hue palette assigned to new members in rotation.
export const MEMBER_HUES = [245, 25, 305, 155, 205, 345, 45]
