<script setup lang="ts">
import { catColor, monthKey, stepMonth } from '~~/shared/config'

definePageMeta({ titleKey: 'nav.summary', subtitleKey: 'pageSub.summary' })
const store = useStore()
const cats = useCategories()
const { isDark } = useTweaks()
const { user } = useUserSession()
const { d } = useI18n()
// Shared with /gastos and /relatorios (and mirrored into ?m=).
const selected = useMonth()
// Opens on the signed-in person every time; '' means everyone.
const fWho = ref(user.value?.id ?? '')
const mine = (userId: string) => !fWho.value || userId === fWho.value

onMounted(() => store.ensure())

const monthExpenses = computed(() => store.expenses.value.filter(e => monthKey(e.date) === selected.value && mine(e.userId)))
// Incomes feed the balance stat only — the listings live on /gastos.
const monthIncomes = computed(() => store.incomes.value.filter(i => monthKey(i.date) === selected.value && mine(i.userId)))
const total = computed(() => monthExpenses.value.reduce((a, e) => a + e.amountCents, 0) / 100)
const count = computed(() => monthExpenses.value.length)
const monthIncome = computed(() => monthIncomes.value.reduce((a, i) => a + i.amountCents, 0) / 100)
const saldo = computed(() => monthIncome.value - total.value)

const prevKey = computed(() => {
  const [y, m] = selected.value.split('-').map(Number)
  const d = m === 1 ? { y: y - 1, m: 12 } : { y, m: m - 1 }
  return `${d.y}-${String(d.m).padStart(2, '0')}`
})
const prevTotal = computed(() => store.expenses.value.filter(e => monthKey(e.date) === prevKey.value && mine(e.userId)).reduce((a, e) => a + e.amountCents, 0) / 100)
const prevIncome = computed(() => store.incomes.value.filter(i => monthKey(i.date) === prevKey.value && mine(i.userId)).reduce((a, i) => a + i.amountCents, 0) / 100)
// Compared in euros, not percent: a percentage against a zero or negative
// previous balance says nothing useful.
const saldoDelta = computed(() => saldo.value - (prevIncome.value - prevTotal.value))
const hasPrev = computed(() => prevTotal.value !== 0 || prevIncome.value !== 0)

const monthLabel = computed(() => {
  const [y, m] = selected.value.split('-').map(Number)
  if (!y || !m) return ''
  return d(new Date(y, m - 1, 1), 'monthYear')
})
function stepMonthBy(delta: number) { selected.value = stepMonth(selected.value, delta) }

// By category
const byCat = computed(() => {
  const map: Record<string, number> = {}
  for (const e of monthExpenses.value) map[e.cat] = (map[e.cat] || 0) + e.amountCents
  return cats.active.value.map(c => ({ cat: c, cents: map[c.id] || 0 }))
    .filter(x => x.cents > 0).sort((a, b) => b.cents - a.cents)
})
const donutSegments = computed(() => byCat.value.map(x => ({ value: x.cents, color: catColor(x.cat.hue, isDark.value), label: cats.catLabel(x.cat.id) })))
</script>

<template>
  <div style="max-width: 1100px; margin: 0 auto; display: flex; flex-direction: column; gap: 18px">
    <!-- Month stepper (same control as /gastos) + person filter -->
    <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap">
      <div style="display: flex; align-items: center; gap: 4px">
        <UiIconButton name="chevLeft" :label="$t('movements.prevMonth')" @click="stepMonthBy(-1)" />
        <div class="tnum" style="min-width: 150px; text-align: center; font-weight: 600; font-size: 15px; text-transform: capitalize">{{ monthLabel }}</div>
        <UiIconButton name="chevRight" :label="$t('movements.nextMonth')" @click="stepMonthBy(1)" />
      </div>
      <div style="flex: 1" />
      <div style="width: 150px">
        <UiSelect v-model="fWho">
          <option value="">{{ $t('expenses.allPeople') }}</option>
          <option v-for="m in store.members.value" :key="m.id" :value="m.id">{{ m.name }}</option>
        </UiSelect>
      </div>
    </div>

    <UiCard :pad="24">
      <div style="display: flex; justify-content: space-between; align-items: flex-start">
        <div style="font-size: 13px; color: var(--muted)">{{ $t('summary.balance') }} · {{ monthLabel }}</div>
        <UiTag v-if="hasPrev" :tone="saldoDelta >= 0 ? 'accent' : 'muted'">
          {{ saldoDelta >= 0 ? '▲' : '▼' }} {{ $t('summary.vsPrevAmount', { amt: $n(Math.abs(saldoDelta), 'currency0') }) }}
        </UiTag>
      </div>
      <div
        class="tnum"
        style="font-size: 42px; font-weight: 700; letter-spacing: -0.02em; margin: 8px 0 16px"
        :style="{ color: saldo >= 0 ? 'var(--pos)' : 'var(--neg)' }"
      >{{ saldo >= 0 ? '+' : '' }}{{ $n(saldo, 'currency') }}</div>
      <div style="display: flex; gap: 26px; flex-wrap: wrap">
        <div><div class="tnum" style="font-weight: 600; color: var(--pos)">{{ $n(monthIncome, 'currency0') }}</div><div style="font-size: 12.5px; color: var(--muted)">{{ $t('summary.income') }}</div></div>
        <div><div class="tnum" style="font-weight: 600">{{ $n(total, 'currency0') }}</div><div style="font-size: 12.5px; color: var(--muted)">{{ $t('summary.spent') }}</div></div>
        <div><div class="tnum" style="font-weight: 600">{{ count }}</div><div style="font-size: 12.5px; color: var(--muted)">{{ $t('summary.movements') }}</div></div>
      </div>
    </UiCard>

    <UiCard :pad="22">
      <UiSectionTitle>
        {{ $t('summary.byCategory') }}
        <template #action><NuxtLink to="/relatorios" style="font-size: 13px; color: var(--accent); font-weight: 600">{{ $t('summary.viewReports') }}</NuxtLink></template>
      </UiSectionTitle>
      <div v-if="byCat.length" class="donut-row" style="display: flex; align-items: center; gap: 24px">
        <UiDonut :segments="donutSegments" :size="168">
          <template #center>
            <div>
              <div style="font-size: 12px; color: var(--muted)">{{ $t('summary.total') }}</div>
              <div class="tnum" style="font-size: 19px; font-weight: 700">{{ $n(total, 'currency0') }}</div>
            </div>
          </template>
        </UiDonut>
        <div style="flex: 1; display: flex; flex-direction: column; gap: 10px">
          <div v-for="x in byCat.slice(0, 5)" :key="x.cat.id" style="display: flex; align-items: center; gap: 10px; font-size: 13.5px">
            <UiCatDot :cat="x.cat" :size="9" />
            <span style="flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">{{ cats.catLabel(x.cat.id) }}</span>
            <span class="tnum" style="font-weight: 600">{{ $n(x.cents / 100, 'currency0') }}</span>
            <span class="tnum" style="color: var(--muted); width: 38px; text-align: right">{{ Math.round((x.cents / (total * 100 || 1)) * 100) }}%</span>
          </div>
        </div>
      </div>
      <UiEmptyState v-else :title="$t('summary.emptyTitle')" :sub="$t('summary.emptySub')" />
    </UiCard>

  </div>
</template>
