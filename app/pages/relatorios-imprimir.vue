<script setup lang="ts">
import { monthKey, firstName } from '~~/shared/config'

// Print-only report view: opened in a new tab as /relatorios/imprimir?mes=YYYY-MM.
// No app chrome (layout: false); auto-triggers the browser print dialog once data
// is loaded so the user can "Save as PDF".
definePageMeta({ layout: false })

const route = useRoute()
const store = useStore()
const cats = useCategories()
const incomeCats = useIncomeCategories()
const { d, n, t, locale } = useI18n()
const appName = useRuntimeConfig().public.appName

const mes = computed(() => {
  const q = String(route.query.mes || '')
  return /^\d{4}-\d{2}$/.test(q) ? q : monthKey(new Date().toISOString().slice(0, 10))
})
const [yy, mm] = mes.value.split('-').map(Number)
const monthTitle = computed(() => d(new Date(yy, mm - 1, 1), 'monthYear'))

const monthExpenses = computed(() =>
  store.expenses.value.filter(e => monthKey(e.date) === mes.value).sort((a, b) => (a.date < b.date ? -1 : 1)))
const monthIncomes = computed(() =>
  store.incomes.value.filter(i => monthKey(i.date) === mes.value).sort((a, b) => (a.date < b.date ? -1 : 1)))

const expenseCents = computed(() => monthExpenses.value.reduce((a, e) => a + e.amountCents, 0))
const incomeCents = computed(() => monthIncomes.value.reduce((a, i) => a + i.amountCents, 0))
const saldoCents = computed(() => incomeCents.value - expenseCents.value)
const avgCents = computed(() => monthExpenses.value.length ? expenseCents.value / monthExpenses.value.length : 0)

const byCat = computed(() => {
  const acc: Record<string, { total: number, subs: Record<string, number> }> = {}
  for (const e of monthExpenses.value) {
    const a = acc[e.cat] || (acc[e.cat] = { total: 0, subs: {} })
    a.total += e.amountCents
    const sk = e.sub || ''
    a.subs[sk] = (a.subs[sk] || 0) + e.amountCents
  }
  return Object.entries(acc).map(([cat, v]) => ({
    cat,
    label: cats.catLabel(cat),
    cents: v.total,
    subs: Object.entries(v.subs)
      .map(([subId, cents]) => ({ subId, label: subId ? cats.subLabel(cat, subId) : '(—)', cents }))
      .sort((a, b) => b.cents - a.cents),
  })).sort((a, b) => b.cents - a.cents)
})

const members = computed(() => store.members.value)
const quotaCents = computed(() => members.value.length ? expenseCents.value / members.value.length : 0)
const byPerson = computed(() => {
  const map: Record<string, number> = {}
  for (const e of monthExpenses.value) map[e.userId] = (map[e.userId] || 0) + e.amountCents
  return members.value.map(m => ({ member: m, paid: map[m.id] || 0, diff: (map[m.id] || 0) - quotaCents.value }))
    .sort((a, b) => b.paid - a.paid)
})

// Annual mini (12 months of the report's year).
const annual = computed(() => {
  const exp: Record<string, number> = {}
  const inc: Record<string, number> = {}
  const y = String(yy)
  for (const e of store.expenses.value) if (e.date.slice(0, 4) === y) exp[monthKey(e.date)] = (exp[monthKey(e.date)] || 0) + e.amountCents
  for (const i of store.incomes.value) if (i.date.slice(0, 4) === y) inc[monthKey(i.date)] = (inc[monthKey(i.date)] || 0) + i.amountCents
  return Array.from({ length: 12 }, (_, m) => {
    const mk = `${y}-${String(m + 1).padStart(2, '0')}`
    return {
      mk,
      label: new Intl.DateTimeFormat(locale.value, { month: 'short' }).format(new Date(2000, m, 1)),
      expense: exp[mk] || 0,
      saldo: (inc[mk] || 0) - (exp[mk] || 0),
      current: mk === mes.value,
    }
  })
})
const maxAnnual = computed(() => Math.max(...annual.value.map(a => a.expense), 1))

function euro(cents: number) { return n(cents / 100, 'currency') }
function day(date: string) { return d(new Date(date + 'T00:00:00'), 'short') }
function memberName(id: string) { return store.memberById.value[id]?.name || '—' }

function doPrint() { window.print() }

let printed = false
onMounted(async () => {
  await store.ensure()
  await nextTick()
  if (printed || route.query.auto === '0') return // auto=0 → preview without the dialog
  printed = true
  setTimeout(doPrint, 350)
})
</script>

<template>
  <div class="doc">
    <div class="no-print bar">
      <button @click="doPrint">{{ t('reports.printNow') }}</button>
      <NuxtLink to="/relatorios">{{ t('reports.back') }}</NuxtLink>
    </div>

    <!-- Page 1: overview -->
    <section class="sheet">
      <header class="head">
        <div>
          <div class="brand">{{ appName }}</div>
          <h1>{{ t('reports.reportTitle', { month: monthTitle }) }}</h1>
        </div>
        <div class="gen">{{ t('reports.generatedAt', { date: d(new Date(), 'long') }) }}</div>
      </header>

      <div class="stats">
        <div class="stat"><span>{{ t('summary.income') }}</span><b class="pos">{{ euro(incomeCents) }}</b></div>
        <div class="stat"><span>{{ t('summary.totalSpent') }}</span><b>{{ euro(expenseCents) }}</b></div>
        <div class="stat"><span>{{ t('balance.monthBalance') }}</span><b :class="saldoCents >= 0 ? 'pos' : 'neg'">{{ saldoCents >= 0 ? '+' : '' }}{{ euro(saldoCents) }}</b></div>
        <div class="stat"><span>{{ t('summary.movements') }}</span><b>{{ monthExpenses.length }}</b></div>
        <div class="stat"><span>{{ t('summary.avgPerExpense') }}</span><b>{{ euro(avgCents) }}</b></div>
      </div>

      <div class="cols">
        <div>
          <h2>{{ t('summary.byCategory') }}</h2>
          <table class="mini">
            <tbody>
              <template v-for="x in byCat" :key="x.cat">
                <tr class="cat-row">
                  <td>{{ x.label }}</td>
                  <td class="num">{{ euro(x.cents) }}</td>
                  <td class="num muted">{{ Math.round((x.cents / (expenseCents || 1)) * 100) }}%</td>
                </tr>
                <tr v-for="s in x.subs" :key="x.cat + s.subId" class="sub-row">
                  <td class="sub">{{ s.label }}</td>
                  <td class="num muted">{{ euro(s.cents) }}</td>
                  <td class="num muted">{{ Math.round((s.cents / (x.cents || 1)) * 100) }}%</td>
                </tr>
              </template>
              <tr v-if="!byCat.length"><td class="muted" colspan="3">—</td></tr>
            </tbody>
          </table>
        </div>
        <div>
          <h2>{{ t('summary.contribByPerson') }}</h2>
          <table class="mini">
            <tbody>
              <tr v-for="p in byPerson" :key="p.member.id">
                <td>{{ firstName(p.member.name) }}</td>
                <td class="num">{{ euro(p.paid) }}</td>
                <td class="num" :class="p.diff >= 0 ? 'pos' : 'neg'">{{ p.diff >= 0 ? '+' : '' }}{{ euro(p.diff) }}</td>
              </tr>
            </tbody>
          </table>
          <div class="quota">{{ t('balance.avgQuota') }}: <b>{{ euro(quotaCents) }}</b></div>
        </div>
      </div>

      <h2>{{ t('reports.annualEvolution') }} · {{ yy }}</h2>
      <div class="annual">
        <div v-for="a in annual" :key="a.mk" class="acol">
          <div class="aval">{{ a.expense ? n(a.expense / 100, 'currency0') : '' }}</div>
          <div class="abarwrap">
            <div class="abar" :class="{ cur: a.current }" :style="{ height: `${(a.expense / maxAnnual) * 100}%` }" />
          </div>
          <div class="alabel">{{ a.label }}</div>
          <div class="asaldo" :class="a.saldo > 0 ? 'pos' : a.saldo < 0 ? 'neg' : 'muted'">
            {{ (a.expense || a.saldo) ? `${a.saldo >= 0 ? '+' : ''}${n(a.saldo / 100, 'currency0')}` : '—' }}
          </div>
        </div>
      </div>
    </section>

    <!-- Page 2+: expense records -->
    <section class="sheet records">
      <h2>{{ t('nav.expenses') }} · {{ monthTitle }}</h2>
      <table class="records-table">
        <thead>
          <tr>
            <th>{{ t('reports.colDate') }}</th>
            <th>{{ t('reports.colCategory') }}</th>
            <th>{{ t('reports.colSub') }}</th>
            <th>{{ t('reports.colMethod') }}</th>
            <th>{{ t('reports.colWho') }}</th>
            <th class="num">{{ t('reports.colAmount') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="e in monthExpenses" :key="e.id">
            <td>{{ day(e.date) }}</td>
            <td>{{ cats.catLabel(e.cat) }}</td>
            <td>{{ e.sub ? cats.subLabel(e.cat, e.sub) : '—' }}</td>
            <td>{{ e.method || '—' }}</td>
            <td>{{ firstName(memberName(e.userId)) }}</td>
            <td class="num">{{ euro(e.amountCents) }}</td>
          </tr>
          <tr v-if="!monthExpenses.length"><td class="muted" colspan="6">{{ t('reports.noRecords') }}</td></tr>
        </tbody>
        <tfoot v-if="monthExpenses.length">
          <tr><td colspan="5">{{ t('summary.total') }}</td><td class="num">{{ euro(expenseCents) }}</td></tr>
        </tfoot>
      </table>
    </section>

    <!-- Income records -->
    <section v-if="monthIncomes.length" class="sheet records">
      <h2>{{ t('balance.income') }} · {{ monthTitle }}</h2>
      <table class="records-table">
        <thead>
          <tr>
            <th>{{ t('reports.colDate') }}</th>
            <th>{{ t('incomeModal.category') }}</th>
            <th>{{ t('reports.colWho') }}</th>
            <th class="num">{{ t('reports.colAmount') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="i in monthIncomes" :key="i.id">
            <td>{{ day(i.date) }}</td>
            <td>{{ i.incomeCat ? incomeCats.catLabel(i.incomeCat) : (i.source || '—') }}</td>
            <td>{{ firstName(memberName(i.userId)) }}</td>
            <td class="num">{{ euro(i.amountCents) }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr><td colspan="3">{{ t('summary.total') }}</td><td class="num">{{ euro(incomeCents) }}</td></tr>
        </tfoot>
      </table>
    </section>
  </div>
</template>

<style scoped>
.doc {
  background: #fff;
  color: #111;
  max-width: 820px;
  margin: 0 auto;
  padding: 24px;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.bar { display: flex; gap: 12px; align-items: center; margin-bottom: 20px; }
.bar button { padding: 8px 16px; border: none; border-radius: 8px; background: #2563eb; color: #fff; font-weight: 600; cursor: pointer; }
.bar a { color: #2563eb; font-size: 14px; text-decoration: none; }
.pos { color: #157347; }
.neg { color: #b02a37; }
.muted { color: #777; }

.head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 18px; }
.brand { font-size: 13px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: #555; }
.head h1 { font-size: 24px; font-weight: 700; margin-top: 2px; }
.gen { font-size: 11px; color: #777; text-align: right; }

.stats { display: flex; gap: 8px; margin-bottom: 22px; flex-wrap: wrap; }
.stat { flex: 1; min-width: 110px; border: 1px solid #ddd; border-radius: 8px; padding: 10px 12px; }
.stat span { display: block; font-size: 11px; color: #777; margin-bottom: 3px; }
.stat b { font-size: 18px; font-variant-numeric: tabular-nums; }

.cols { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin-bottom: 22px; }
h2 { font-size: 14px; font-weight: 700; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #ddd; }
.mini { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.mini td { padding: 4px 2px; border-bottom: 1px solid #f0f0f0; }
.mini .cat-row td { font-weight: 600; border-bottom: none; padding-top: 6px; }
.mini .sub-row td { font-size: 11px; color: #666; padding: 2px 2px; border-bottom: none; }
.mini .sub-row td.sub { padding-left: 14px; }
.mini .cat-row { break-inside: avoid; }
.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.quota { font-size: 12px; color: #555; margin-top: 8px; }

.annual { display: flex; align-items: flex-end; gap: 4px; height: 150px; margin-top: 8px; }
.acol { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; height: 100%; justify-content: flex-end; min-width: 0; }
.aval { font-size: 8.5px; font-weight: 600; color: #444; white-space: nowrap; font-variant-numeric: tabular-nums; }
.abarwrap { width: 100%; display: flex; justify-content: center; align-items: flex-end; flex: 1; }
.abar { width: 100%; max-width: 26px; background: #2563eb; border-radius: 3px 3px 0 0; min-height: 1px; }
.abar.cur { background: #111; }
.alabel { font-size: 9.5px; color: #777; text-transform: capitalize; }
.asaldo { font-size: 8px; font-weight: 600; white-space: nowrap; font-variant-numeric: tabular-nums; }

.records-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.records-table th { text-align: left; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.03em; color: #555; border-bottom: 2px solid #111; padding: 6px 6px; }
.records-table th.num { text-align: right; }
.records-table td { padding: 6px 6px; border-bottom: 1px solid #eee; }
.records-table tfoot td { border-top: 2px solid #111; border-bottom: none; font-weight: 700; padding-top: 8px; }

@media screen {
  .doc { box-shadow: 0 1px 8px rgba(0,0,0,0.15); margin-top: 24px; margin-bottom: 24px; border-radius: 8px; }
}

@media print {
  .no-print { display: none !important; }
  .doc { box-shadow: none; max-width: none; margin: 0; padding: 0; }
  .sheet { break-after: page; }
  .sheet:last-child { break-after: auto; }
  .records-table thead { display: table-header-group; }
  .records-table tr { break-inside: avoid; }
}

@page { size: A4; margin: 14mm; }
</style>
