// Server-side aggregation engine for the chat assistant. The DB does the maths so
// the model never invents numbers — it only picks dimensions, measure and filters.

import { desc } from 'drizzle-orm'
import { db, schema } from './db'
import type { User } from '../db/schema'
import { monthKey, parseDate, MONTHS_PT } from '../../shared/config'
import { catNameMap, subNameMap } from './categories'
import { incomeCatNameMap } from './incomeCategories'

export type Dimension = 'pessoa' | 'categoria' | 'subcategoria' | 'dia' | 'mes' | 'ano' | 'metodo' | 'fonte'
export type Measure = 'soma' | 'contagem' | 'media'
export type Dataset = 'gastos' | 'rendimentos'

// Generic movement row: expenses carry cat/sub/method; incomes carry incomeCat
// (+ legacy source). Lets both datasets share the engine.
interface Row {
  date: string
  amountCents: number
  userId: string
  cat: string
  sub: string
  method: string
  incomeCat: string
  source: string
}

export interface AggFilters {
  dateFrom?: string // yyyy-mm-dd
  dateTo?: string // yyyy-mm-dd
  day?: string // yyyy-mm-dd
  month?: string // yyyy-mm
  year?: string // yyyy
  cat?: string
  sub?: string
  who?: string // name or id
  method?: string
  fonte?: string // income source (rendimentos only)
}

export interface AggQuery {
  dataset?: Dataset // gastos (default) | rendimentos
  groupBy: Dimension
  series?: Dimension // optional 2nd dimension → multi-series
  measure?: Measure
  filters?: AggFilters
  sort?: 'asc' | 'desc'
  limit?: number
}

export interface AggResult {
  categories: string[] // x-axis labels, in order
  series: { name: string, data: number[] }[] // each aligned to categories
  measure: Measure
  measureLabel: string // '€' | '' (count)
  total: number
}

const TEMPORAL: Dimension[] = ['dia', 'mes', 'ano']

function members(): Promise<User[]> { return db.select().from(schema.users) }
async function loadRows(dataset: Dataset): Promise<Row[]> {
  if (dataset === 'rendimentos') {
    const rows = await db.select().from(schema.incomes).orderBy(desc(schema.incomes.date))
    return rows.map(i => ({ ...i, cat: '', sub: '', method: '' }))
  }
  const rows = await db.select().from(schema.expenses).orderBy(desc(schema.expenses.date))
  return rows.map(e => ({ ...e, incomeCat: '', source: '' }))
}

function resolveWho(ms: User[], who?: string): User | undefined {
  if (!who) return undefined
  const w = who.trim().toLowerCase()
  return ms.find(m => m.id === who)
    || ms.find(m => m.name.toLowerCase() === w)
    || ms.find(m => m.name.toLowerCase().split(' ')[0] === w)
    || ms.find(m => m.name.toLowerCase().includes(w))
}

function fonteLabel(e: Row, incomeMap: Record<string, string>): string {
  return (e.incomeCat ? incomeMap[e.incomeCat] : '') || e.source || ''
}

function applyFilters(rows: Row[], f: AggFilters | undefined, ms: User[], incomeMap: Record<string, string>): Row[] {
  if (!f) return rows
  const who = resolveWho(ms, f.who)
  return rows.filter((e) => {
    if (f.day && e.date !== f.day) return false
    if (f.month && monthKey(e.date) !== f.month) return false
    if (f.year && e.date.slice(0, 4) !== f.year) return false
    if (f.dateFrom && e.date < f.dateFrom) return false
    if (f.dateTo && e.date > f.dateTo) return false
    if (f.cat && e.cat !== f.cat) return false
    if (f.sub && e.sub.toLowerCase() !== f.sub.toLowerCase()) return false
    if (who && e.userId !== who.id) return false
    if (f.method && e.method.toLowerCase() !== f.method.toLowerCase()) return false
    if (f.fonte && !fonteLabel(e, incomeMap).toLowerCase().includes(f.fonte.toLowerCase())) return false
    return true
  })
}

// Returns { key, label, sort } for a row on a given dimension.
function dimOf(dim: Dimension, e: Row, ms: User[], catMap: Record<string, string>, subMap: Record<string, string>, incomeMap: Record<string, string>): { key: string, label: string, sort: string } {
  switch (dim) {
    case 'pessoa': {
      const m = ms.find(x => x.id === e.userId)
      return { key: e.userId, label: m?.name || '—', sort: (m?.name || '—').toLowerCase() }
    }
    case 'categoria': {
      const label = catMap[e.cat] || e.cat
      return { key: e.cat, label, sort: label }
    }
    case 'subcategoria': {
      const label = e.sub ? (subMap[e.sub] || e.sub) : '(—)'
      return { key: e.sub || '', label, sort: label }
    }
    case 'dia': {
      const p = parseDate(e.date)
      return { key: e.date, label: `${String(p.d).padStart(2, '0')} ${MONTHS_PT[p.m]}`, sort: e.date }
    }
    case 'mes': {
      const mk = monthKey(e.date); const p = parseDate(e.date)
      return { key: mk, label: `${MONTHS_PT[p.m]} ${p.y}`, sort: mk }
    }
    case 'ano': {
      const y = e.date.slice(0, 4)
      return { key: y, label: y, sort: y }
    }
    case 'metodo':
      return { key: e.method || '', label: e.method || '(sem método)', sort: e.method || '~' }
    case 'fonte': {
      const label = fonteLabel(e, incomeMap)
      return { key: e.incomeCat || label.toLowerCase() || '', label: label || '(sem categoria)', sort: (label || '~').toLowerCase() }
    }
  }
}

export async function aggregate(q: AggQuery, locale?: string): Promise<AggResult> {
  const [ms, allRows, catMap, subMap, incomeMap] = await Promise.all([
    members(), loadRows(q.dataset === 'rendimentos' ? 'rendimentos' : 'gastos'), catNameMap(locale), subNameMap(locale), incomeCatNameMap(locale),
  ])
  const measure: Measure = q.measure || 'soma'
  const rows = applyFilters(allRows, q.filters, ms, incomeMap)

  // Collect cells keyed by primary + series.
  const primaries = new Map<string, { label: string, sort: string }>()
  const seriesKeys = new Map<string, { label: string, sort: string }>()
  const cells = new Map<string, { sum: number, count: number }>() // `${pKey}|${sKey}`

  for (const e of rows) {
    const p = dimOf(q.groupBy, e, ms, catMap, subMap, incomeMap)
    primaries.set(p.key, { label: p.label, sort: p.sort })
    const s = q.series ? dimOf(q.series, e, ms, catMap, subMap, incomeMap) : { key: '_', label: measureLabelName(measure), sort: '_' }
    seriesKeys.set(s.key, { label: s.label, sort: s.sort })
    const ck = `${p.key}|${s.key}`
    const cell = cells.get(ck) || { sum: 0, count: 0 }
    cell.sum += e.amountCents / 100
    cell.count += 1
    cells.set(ck, cell)
  }

  const cellValue = (pKey: string, sKey: string): number => {
    const c = cells.get(`${pKey}|${sKey}`)
    if (!c) return 0
    if (measure === 'contagem') return c.count
    if (measure === 'media') return c.count ? round2(c.sum / c.count) : 0
    return round2(c.sum)
  }

  // Order primaries: temporal → chronological; else by total measure desc (or sort override).
  const totalOf = (pKey: string) => [...seriesKeys.keys()].reduce((a, sKey) => a + cellValue(pKey, sKey), 0)
  let primKeys = [...primaries.keys()]
  if (TEMPORAL.includes(q.groupBy)) {
    primKeys.sort((a, b) => primaries.get(a)!.sort.localeCompare(primaries.get(b)!.sort))
    if (q.sort === 'desc') primKeys.reverse()
  } else {
    primKeys.sort((a, b) => totalOf(b) - totalOf(a))
    if (q.sort === 'asc') primKeys.reverse()
  }
  if (q.limit && q.limit > 0) primKeys = primKeys.slice(0, q.limit)

  // Order series by total desc for a sensible legend.
  const seriesTotal = (sKey: string) => primKeys.reduce((a, pKey) => a + cellValue(pKey, sKey), 0)
  let sKeys = [...seriesKeys.keys()]
  if (q.series && TEMPORAL.includes(q.series)) sKeys.sort((a, b) => seriesKeys.get(a)!.sort.localeCompare(seriesKeys.get(b)!.sort))
  else sKeys.sort((a, b) => seriesTotal(b) - seriesTotal(a))

  const categories = primKeys.map(k => primaries.get(k)!.label)
  const series = sKeys.map(sKey => ({
    name: seriesKeys.get(sKey)!.label,
    data: primKeys.map(pKey => cellValue(pKey, sKey)),
  }))
  const total = round2(rows.reduce((a, e) => a + e.amountCents / 100, 0))

  return { categories, series, measure, measureLabel: measure === 'contagem' ? '' : '€', total }
}

function measureLabelName(m: Measure): string {
  return m === 'contagem' ? 'Movimentos' : m === 'media' ? 'Média' : 'Total'
}
function round2(n: number): number { return Math.round(n * 100) / 100 }
