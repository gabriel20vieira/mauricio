// Shared domain config + formatting — ported from the design bundle's data.jsx.

export const MONTHS_PT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
export const MONTHS_PT_LONG = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

const fmtEUR = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' })
const fmtEUR0 = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
export function euro(n: number) { return fmtEUR.format(n || 0) }
export function euro0(n: number) { return fmtEUR0.format(n || 0) }

export function parseDate(s: string) { const [y, m, d] = s.split('-').map(Number); return { y, m: m - 1, d } }
export function monthKey(s: string) { const p = parseDate(s); return `${p.y}-${String(p.m + 1).padStart(2, '0')}` }
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

export function initials(name: string) { return name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase() }
export function firstName(name: string) { return name.split(' ')[0] }

// Avatar hue palette assigned to new members in rotation.
export const MEMBER_HUES = [245, 25, 305, 155, 205, 345, 45]
