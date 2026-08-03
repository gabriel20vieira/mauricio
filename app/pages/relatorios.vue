<script setup lang="ts">
import { catColor, monthKey } from '~~/shared/config'

definePageMeta({ titleKey: 'nav.reports', subtitleKey: 'pageSub.reports' })
const store = useStore()
const cats = useCategories()
const selected = useMonth()
const { isDark } = useTweaks()
const { user } = useUserSession()
const { locale, d } = useI18n()

const mode = ref<'anual' | 'mensal'>('anual')
// Opens on the signed-in person every time; '' means everyone.
const fWho = ref(user.value?.id ?? '')
const mine = (userId: string) => !fWho.value || userId === fWho.value

onMounted(() => store.ensure())

// ---- year selection (annual mode) ----
// Year and month are one selection: both read from (and write to) the month
// shared with the other pages, so switching year here carries over to them.
const year = computed({
  get: () => selected.value.slice(0, 4),
  set: (y: string) => { selected.value = `${y}-${selected.value.slice(5, 7)}` },
})
const years = computed(() => {
  const set = new Set<string>()
  for (const e of store.expenses.value) set.add(e.date.slice(0, 4))
  for (const i of store.incomes.value) set.add(i.date.slice(0, 4))
  set.add(String(new Date().getFullYear()))
  set.add(year.value)
  return [...set].sort().reverse()
})

// ---- period scope: filter movements by the active mode (year vs month) ----
function inScope(date: string) {
  return mode.value === 'anual' ? date.slice(0, 4) === year.value : monthKey(date) === selected.value
}
// Period only — the person breakdown compares everyone, so it must not be
// narrowed by the person filter.
const periodExpenses = computed(() => store.expenses.value.filter(e => inScope(e.date)))
const scopeExpenses = computed(() => periodExpenses.value.filter(e => mine(e.userId)))
const scopeIncomes = computed(() => store.incomes.value.filter(i => inScope(i.date) && mine(i.userId)))
const periodLabel = computed(() => {
  if (mode.value === 'anual') return year.value
  const [y, m] = (selected.value || '').split('-').map(Number)
  return m ? d(new Date(y, m - 1, 1), 'monthYear') : ''
})

const expenseCents = computed(() => scopeExpenses.value.reduce((a, e) => a + e.amountCents, 0))
const incomeCents = computed(() => scopeIncomes.value.reduce((a, i) => a + i.amountCents, 0))
const saldoCents = computed(() => incomeCents.value - expenseCents.value)

// ---- annual evolution (12 months of the selected year) ----
const annual = computed(() => {
  const exp: Record<string, number> = {}
  const inc: Record<string, number> = {}
  for (const e of store.expenses.value) if (e.date.slice(0, 4) === year.value && mine(e.userId)) exp[monthKey(e.date)] = (exp[monthKey(e.date)] || 0) + e.amountCents
  for (const i of store.incomes.value) if (i.date.slice(0, 4) === year.value && mine(i.userId)) inc[monthKey(i.date)] = (inc[monthKey(i.date)] || 0) + i.amountCents
  return Array.from({ length: 12 }, (_, m) => {
    const mk = `${year.value}-${String(m + 1).padStart(2, '0')}`
    const expense = exp[mk] || 0
    const income = inc[mk] || 0
    return {
      mk,
      label: new Intl.DateTimeFormat(locale.value, { month: 'short' }).format(new Date(2000, m, 1)),
      expense,
      income,
      saldo: income - expense,
    }
  })
})
// One scale for both series, otherwise the two bars in a month are not comparable.
const maxAnnual = computed(() => Math.max(...annual.value.flatMap(a => [a.expense, a.income]), 1))
const hasAnnual = computed(() => annual.value.some(a => a.expense || a.income))
function barHeight(cents: number) {
  return { height: `${(cents / maxAnnual.value) * 100}%`, minHeight: cents ? '4px' : '0' }
}

// ---- by category (scoped), with per-subcategory breakdown ----
const byCat = computed(() => {
  // Subs are keyed by cats.subKey, not by the raw stored value: rows holding a label
  // instead of an id, or a different casing, must land on the same line and add up.
  const acc: Record<string, { total: number, subs: Record<string, { label: string, cents: number }> }> = {}
  for (const e of scopeExpenses.value) {
    const a = acc[e.cat] || (acc[e.cat] = { total: 0, subs: {} })
    a.total += e.amountCents
    const sk = cats.subKey(e.cat, e.sub)
    // Unmatched keys are lowercase, so display the raw text as first seen instead.
    const s = a.subs[sk] || (a.subs[sk] = { label: sk ? (cats.subLabel(e.cat, sk) === sk ? e.sub.trim() : cats.subLabel(e.cat, sk)) : '(—)', cents: 0 })
    s.cents += e.amountCents
  }
  return Object.entries(acc).map(([catId, v]) => ({
    catId,
    hue: cats.hue(catId),
    label: cats.catLabel(catId),
    cents: v.total,
    subs: Object.entries(v.subs)
      .map(([subId, s]) => ({ subId, label: s.label, cents: s.cents }))
      .sort((a, b) => b.cents - a.cents),
  })).filter(x => x.cents > 0).sort((a, b) => b.cents - a.cents)
})
const maxCat = computed(() => Math.max(...byCat.value.map(x => x.cents), 1))

// Expand/collapse state for per-category subcategory detail.
const expanded = ref<Set<string>>(new Set())
function toggleCat(catId: string) {
  const s = new Set(expanded.value)
  s.has(catId) ? s.delete(catId) : s.add(catId)
  expanded.value = s
}

function printReport() {
  const q = mode.value === 'anual' ? `ano=${year.value}` : `mes=${selected.value}`
  if (!q.split('=')[1]) return
  // Carry the person filter over so the sheet matches what is on screen.
  const who = fWho.value ? `&pessoa=${encodeURIComponent(fWho.value)}` : ''
  window.open(`/relatorios-imprimir?${q}${who}`, '_blank')
}
</script>

<template>
  <div style="max-width: 1000px; margin: 0 auto; display: flex; flex-direction: column; gap: 16px">
    <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap">
      <UiSegmented v-model="mode" :options="[{ value: 'anual', label: $t('reports.annual') }, { value: 'mensal', label: $t('reports.monthly') }]" />
      <div style="flex: 1" />
      <div style="width: 150px">
        <UiSelect v-model="fWho">
          <option value="">{{ $t('expenses.allPeople') }}</option>
          <option v-for="m in store.members.value" :key="m.id" :value="m.id">{{ m.name }}</option>
        </UiSelect>
      </div>
      <AppMonthPicker v-if="mode === 'mensal'" />
      <div v-else style="width: 120px">
        <UiSelect :model-value="year" @update:model-value="year = $event">
          <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
        </UiSelect>
      </div>
      <UiButton variant="outline" icon="receipt" @click="printReport">{{ $t('reports.print') }}</UiButton>
    </div>

    <!-- Period totals -->
    <UiCard :pad="20">
      <div style="display: flex; gap: 28px; flex-wrap: wrap; align-items: center">
        <div style="font-size: 13px; color: var(--muted); text-transform: capitalize; min-width: 120px">{{ periodLabel }}</div>
        <div><div class="tnum" style="font-weight: 700; font-size: 18px; color: var(--pos)">{{ $n(incomeCents / 100, 'currency0') }}</div><div style="font-size: 12.5px; color: var(--muted)">{{ $t('summary.income') }}</div></div>
        <div><div class="tnum" style="font-weight: 700; font-size: 18px">{{ $n(expenseCents / 100, 'currency0') }}</div><div style="font-size: 12.5px; color: var(--muted)">{{ $t('summary.totalSpent') }}</div></div>
        <div><div class="tnum" style="font-weight: 700; font-size: 18px" :style="{ color: saldoCents >= 0 ? 'var(--pos)' : 'var(--neg)' }">{{ saldoCents >= 0 ? '+' : '' }}{{ $n(saldoCents / 100, 'currency0') }}</div><div style="font-size: 12.5px; color: var(--muted)">{{ $t('summary.balance') }}</div></div>
      </div>
    </UiCard>

    <!-- Annual evolution (annual mode only) -->
    <UiCard v-if="mode === 'anual'" :pad="22">
      <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 12px; flex-wrap: wrap">
        <UiSectionTitle>{{ $t('reports.annualEvolution') }}</UiSectionTitle>
        <div v-if="hasAnnual" class="ann-legend">
          <span><i style="background: var(--chart-expense)" />{{ $t('movements.expenses') }}</span>
          <span><i style="background: var(--chart-income)" />{{ $t('movements.incomes') }}</span>
        </div>
      </div>
      <!-- Two bars per month on a shared scale. Exact figures are on hover; the
           month's balance stays underneath, where the single-series chart had it. -->
      <div v-if="hasAnnual" class="ann-chart">
        <div v-for="a in annual" :key="a.mk" class="ann-col">
          <div class="ann-bars">
            <div class="ann-bar ann-bar-exp" :style="barHeight(a.expense)"
              :title="`${$t('movements.expenses')}: ${$n(a.expense / 100, 'currency')}`" />
            <div class="ann-bar ann-bar-inc" :style="barHeight(a.income)"
              :title="`${$t('movements.incomes')}: ${$n(a.income / 100, 'currency')}`" />
          </div>
          <div class="ann-month">{{ a.label }}</div>
          <div class="tnum ann-saldo"
            :style="{ color: a.saldo > 0 ? 'var(--pos)' : a.saldo < 0 ? 'var(--neg)' : 'var(--faint)' }">
            {{ (a.income || a.expense) ? `${a.saldo >= 0 ? '+' : ''}${$n(a.saldo / 100, 'currency0')}` : '—' }}
          </div>
        </div>
      </div>
      <UiEmptyState v-else icon="chart" :title="$t('reports.noData')" :sub="$t('reports.noDataSub')" />
    </UiCard>

    <UiCard :pad="22">
      <UiSectionTitle>{{ $t('reports.byCategory') }}</UiSectionTitle>
      <div v-if="byCat.length" style="display: flex; flex-direction: column; gap: 14px">
        <div v-for="x in byCat" :key="x.catId">
          <div style="display: flex; align-items: center; gap: 9px; margin-bottom: 6px; font-size: 13.5px; cursor: pointer" role="button"
            :aria-expanded="expanded.has(x.catId)" @click="toggleCat(x.catId)">
            <UiIcon :name="expanded.has(x.catId) ? 'chevDown' : 'chevRight'" :size="14" style="color: var(--muted); flex-shrink: 0" />
            <span :style="{ width: '9px', height: '9px', borderRadius: '50%', background: catColor(x.hue, isDark), flexShrink: 0 }" />
            <span style="flex: 1">{{ x.label }}</span>
            <span class="tnum" style="font-weight: 600">{{ $n(x.cents / 100, 'currency0') }}</span>
            <span class="tnum" style="color: var(--muted); width: 38px; text-align: right">{{ Math.round((x.cents / (expenseCents || 1)) * 100) }}%</span>
          </div>
          <UiMiniBar :value="x.cents" :max="maxCat" :color="catColor(x.hue, isDark)" />
          <!-- Subcategory breakdown -->
          <div v-if="expanded.has(x.catId) && x.subs.length" style="display: flex; flex-direction: column; gap: 8px; margin: 10px 0 2px 23px">
            <div v-for="s in x.subs" :key="s.subId">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px; font-size: 12.5px; color: var(--ink-2)">
                <span style="flex: 1">{{ s.label }}</span>
                <span class="tnum">{{ $n(s.cents / 100, 'currency0') }}</span>
                <span class="tnum" style="color: var(--muted); width: 34px; text-align: right">{{ Math.round((s.cents / (x.cents || 1)) * 100) }}%</span>
              </div>
              <UiMiniBar :value="s.cents" :max="x.cents" :color="catColor(x.hue, isDark)" />
            </div>
          </div>
        </div>
      </div>
      <UiEmptyState v-else icon="chart" :title="$t('reports.noData')" :sub="$t('reports.noDataSub')" />
    </UiCard>
  </div>
</template>

<style scoped>
.ann-legend {
  display: flex;
  gap: 14px;
  font-size: 12px;
  color: var(--muted);
}
.ann-legend span { display: inline-flex; align-items: center; gap: 5px; }
.ann-legend i { width: 9px; height: 9px; border-radius: 3px; }

.ann-chart {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  height: 210px;
  padding-top: 18px;
}
.ann-col {
  flex: 1;
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
}
/* The pair of bars is what fills the column's height; the labels below sit outside it. */
.ann-bars {
  flex: 1;
  width: 100%;
  min-height: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 3px;
}
.ann-bar {
  flex: 1;
  max-width: 17px;
  border-radius: 5px 5px 2px 2px;
}
.ann-bar-exp { background: var(--chart-expense); }
.ann-bar-inc { background: var(--chart-income); }
.ann-month { font-size: 11px; color: var(--muted); font-weight: 500; text-transform: capitalize; }
.ann-saldo { font-size: 10.5px; font-weight: 600; white-space: nowrap; }

@media (max-width: 760px) {
  .ann-chart { gap: 3px; }
  .ann-bars { gap: 2px; }
  .ann-bar { max-width: 11px; }
  .ann-saldo { display: none; } /* no room for 12 currency figures on a phone */
}
</style>
