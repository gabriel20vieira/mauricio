<script setup lang="ts">
import { monthKey, parseDate, stepMonth } from '~~/shared/config'
import type { Movement, Expense, Income } from '~/composables/useStore'

definePageMeta({ titleKey: 'nav.movements', subtitleKey: 'pageSub.movements' })
const store = useStore()
const cats = useCategories()
const incomeCats = useIncomeCategories()
const activeCats = cats.active
const activeIncomeCats = incomeCats.active
const { openNewExpense, openNewIncome } = useAppUi()
const { d } = useI18n()
const selected = useMonth() // defaults to the current month; no syncMonth (free navigation)
onMounted(() => store.ensure())

const q = ref('')
const fCat = ref('') // a category id (expense or income namespace)
const fWho = ref('')
const sort = ref<'date' | 'amount'>('date')

const monthLabel = computed(() => {
  const [y, m] = selected.value.split('-').map(Number)
  return m ? d(new Date(y, m - 1, 1), 'monthYear') : ''
})
function stepMonthBy(delta: number) { selected.value = stepMonth(selected.value, delta) }

// Month-scoped, filtered movements.
const filtered = computed<Movement[]>(() => {
  let rows = store.movements.value.filter(mv => monthKey(mv.date) === selected.value)
  if (q.value.trim()) {
    const s = q.value.toLowerCase()
    rows = rows.filter(mv => mv.note.toLowerCase().includes(s))
  }
  if (fCat.value) {
    rows = rows.filter(mv => mv.kind === 'expense'
      ? (mv.ref as Expense).cat === fCat.value
      : (mv.ref as Income).incomeCat === fCat.value)
  }
  if (fWho.value) rows = rows.filter(mv => mv.userId === fWho.value)
  if (sort.value === 'amount') rows = [...rows].sort((a, b) => b.amountCents - a.amountCents)
  return rows
})

// Totals for the month view (from the filtered set).
const expenseCents = computed(() => filtered.value.filter(m => m.kind === 'expense').reduce((a, m) => a + m.amountCents, 0))
const incomeCents = computed(() => filtered.value.filter(m => m.kind === 'income').reduce((a, m) => a + m.amountCents, 0))
const saldoCents = computed(() => incomeCents.value - expenseCents.value)

// Day grouping (only when sorting by date). Newest day first.
const byDay = computed(() => {
  const map = new Map<string, Movement[]>()
  for (const mv of filtered.value) {
    const arr = map.get(mv.date) || []
    arr.push(mv)
    map.set(mv.date, arr)
  }
  return [...map.keys()].sort().reverse().map(date => ({ date, rows: map.get(date)! }))
})

function clearFilters() { q.value = ''; fCat.value = ''; fWho.value = ''; sort.value = 'date' }
</script>

<template>
  <div style="max-width: 1000px; margin: 0 auto; display: flex; flex-direction: column; gap: 16px">
    <!-- Month stepper + add buttons -->
    <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap">
      <div style="display: flex; align-items: center; gap: 4px">
        <UiIconButton name="chevLeft" :label="$t('movements.prevMonth')" @click="stepMonthBy(-1)" />
        <div class="tnum" style="min-width: 150px; text-align: center; font-weight: 600; font-size: 15px; text-transform: capitalize">{{ monthLabel }}</div>
        <UiIconButton name="chevRight" :label="$t('movements.nextMonth')" @click="stepMonthBy(1)" />
      </div>
      <div style="flex: 1" />
      <UiButton variant="outline" icon="trend" @click="openNewIncome">{{ $t('layout.newIncome') }}</UiButton>
      <UiButton variant="primary" icon="plus" @click="openNewExpense">{{ $t('layout.newExpense') }}</UiButton>
    </div>

    <!-- Filters -->
    <UiCard :pad="18">
      <div style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center">
        <div style="position: relative; flex: 1; min-width: 200px">
          <UiIcon name="search" :size="17" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--muted)" />
          <input v-model="q" :placeholder="$t('expenses.searchPlaceholder')"
            style="width: 100%; padding: 10px 12px 10px 36px; border-radius: var(--radius-sm); font-size: 14px; border: 1px solid var(--border-2); background: var(--surface); color: var(--ink); outline: none" />
        </div>
        <div style="width: 170px">
          <UiSelect v-model="fCat">
            <option value="">{{ $t('expenses.category') }}</option>
            <optgroup :label="$t('movements.expenses')">
              <option v-for="c in activeCats" :key="c.id" :value="c.id">{{ cats.catLabel(c.id) }}</option>
            </optgroup>
            <optgroup :label="$t('movements.incomes')">
              <option v-for="c in activeIncomeCats" :key="c.id" :value="c.id">{{ incomeCats.catLabel(c.id) }}</option>
            </optgroup>
          </UiSelect>
        </div>
        <div style="width: 140px">
          <UiSelect v-model="fWho"><option value="">{{ $t('expenses.person') }}</option><option v-for="m in store.members.value" :key="m.id" :value="m.id">{{ m.name }}</option></UiSelect>
        </div>
        <UiSegmented v-model="sort" size="sm" :options="[{ value: 'date', label: $t('expenses.sortDate') }, { value: 'amount', label: $t('expenses.sortAmount') }]" />
      </div>
    </UiCard>

    <!-- Totals -->
    <UiCard :pad="18">
      <div style="display: flex; gap: 28px; flex-wrap: wrap; align-items: center">
        <div><div class="tnum" style="font-weight: 700; font-size: 17px">{{ $n(expenseCents / 100, 'currency') }}</div><div style="font-size: 12.5px; color: var(--muted)">{{ $t('summary.totalSpent') }}</div></div>
        <div><div class="tnum" style="font-weight: 700; font-size: 17px; color: var(--pos)">{{ $n(incomeCents / 100, 'currency') }}</div><div style="font-size: 12.5px; color: var(--muted)">{{ $t('summary.income') }}</div></div>
        <div><div class="tnum" style="font-weight: 700; font-size: 17px" :style="{ color: saldoCents >= 0 ? 'var(--pos)' : 'var(--neg)' }">{{ saldoCents >= 0 ? '+' : '' }}{{ $n(saldoCents / 100, 'currency') }}</div><div style="font-size: 12.5px; color: var(--muted)">{{ $t('summary.balance') }}</div></div>
        <div style="flex: 1" />
        <div style="display: flex; align-items: center; gap: 10px">
          <span style="font-size: 13.5px; color: var(--muted)">{{ $t('expenses.count', { n: filtered.length }) }}</span>
          <button v-if="q || fCat || fWho" style="font-size: 12.5px; color: var(--accent); background: none; border: none; font-weight: 600; cursor: pointer" @click="clearFilters">{{ $t('expenses.clearFilters') }}</button>
        </div>
      </div>
    </UiCard>

    <!-- List -->
    <UiCard :pad="22">
      <template v-if="filtered.length">
        <!-- Grouped by day (date sort) -->
        <template v-if="sort === 'date'">
          <div v-for="g in byDay" :key="g.date">
            <div style="font-size: 12px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--muted); padding: 14px 4px 4px">
              {{ $d(new Date(g.date + 'T00:00:00'), 'long') }}
            </div>
            <AppMovementRow v-for="mv in g.rows" :key="mv.kind + mv.id" :movement="mv" />
          </div>
        </template>
        <!-- Flat by amount -->
        <template v-else>
          <AppMovementRow v-for="mv in filtered" :key="mv.kind + mv.id" :movement="mv" />
        </template>
      </template>
      <UiEmptyState v-else :title="$t('movements.emptyTitle')" :sub="$t('movements.emptySub')" />
    </UiCard>
  </div>
</template>
