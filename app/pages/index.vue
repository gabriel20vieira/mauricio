<script setup lang="ts">
import { catColor, monthKey, firstName } from '~~/shared/config'

definePageMeta({ titleKey: 'nav.summary', subtitleKey: 'pageSub.summary' })
const store = useStore()
const cats = useCategories()
const selected = useMonth()
const { isDark } = useTweaks()
const { d } = useI18n()
const { openNewIncome } = useAppUi()

onMounted(async () => {
  await store.ensure()
  syncMonth(selected, store.expenses.value)
})
watch(() => store.expenses.value, (ex) => syncMonth(selected, ex))

const monthExpenses = computed(() => store.expenses.value.filter(e => monthKey(e.date) === selected.value))
const monthIncomes = computed(() => store.incomes.value.filter(i => monthKey(i.date) === selected.value))
const monthMovements = computed(() => store.movements.value.filter(mv => monthKey(mv.date) === selected.value))
const total = computed(() => monthExpenses.value.reduce((a, e) => a + e.amountCents, 0) / 100)
const count = computed(() => monthExpenses.value.length)
const avg = computed(() => count.value ? total.value / count.value : 0)
const monthIncome = computed(() => monthIncomes.value.reduce((a, i) => a + i.amountCents, 0) / 100)
const saldo = computed(() => monthIncome.value - total.value)
const members = computed(() => store.members.value)
const quota = computed(() => members.value.length ? total.value / members.value.length : 0)

const prevKey = computed(() => {
  const [y, m] = selected.value.split('-').map(Number)
  const d = m === 1 ? { y: y - 1, m: 12 } : { y, m: m - 1 }
  return `${d.y}-${String(d.m).padStart(2, '0')}`
})
const prevTotal = computed(() => store.expenses.value.filter(e => monthKey(e.date) === prevKey.value).reduce((a, e) => a + e.amountCents, 0) / 100)
const delta = computed(() => prevTotal.value ? Math.round(((total.value - prevTotal.value) / prevTotal.value) * 100) : 0)

const monthLabel = computed(() => {
  const [y, m] = selected.value.split('-').map(Number)
  if (!y || !m) return ''
  return d(new Date(y, m - 1, 1), 'monthYear')
})

// By category
const byCat = computed(() => {
  const map: Record<string, number> = {}
  for (const e of monthExpenses.value) map[e.cat] = (map[e.cat] || 0) + e.amountCents
  return cats.active.value.map(c => ({ cat: c, cents: map[c.id] || 0 }))
    .filter(x => x.cents > 0).sort((a, b) => b.cents - a.cents)
})
const donutSegments = computed(() => byCat.value.map(x => ({ value: x.cents, color: catColor(x.cat.hue, isDark.value), label: cats.catLabel(x.cat.id) })))
const topCats = computed(() => byCat.value.slice(0, 2))

// Per-person contribution vs the average quota (from Balanço).
const contrib = computed(() => {
  const map: Record<string, number> = {}
  for (const e of monthExpenses.value) map[e.userId] = (map[e.userId] || 0) + e.amountCents
  return members.value.map(m => {
    const paid = (map[m.id] || 0) / 100
    return { member: m, paid, diff: paid - quota.value }
  }).sort((a, b) => b.paid - a.paid)
})
const maxPaid = computed(() => Math.max(...contrib.value.map(c => c.paid), 1))

// Minimal transfer suggestion: debtors pay creditors up to the average.
const transfers = computed(() => {
  const creditors = contrib.value.filter(c => c.diff > 0.005).map(c => ({ member: c.member, amt: c.diff }))
  const debtors = contrib.value.filter(c => c.diff < -0.005).map(c => ({ member: c.member, amt: -c.diff }))
  const out: { from: any; to: any; amt: number }[] = []
  let ci = 0, di = 0
  const cs = creditors.map(c => ({ ...c })); const ds = debtors.map(x => ({ ...x }))
  while (ci < cs.length && di < ds.length) {
    const amt = Math.min(cs[ci].amt, ds[di].amt)
    if (amt > 0.005) out.push({ from: ds[di].member, to: cs[ci].member, amt })
    cs[ci].amt -= amt; ds[di].amt -= amt
    if (cs[ci].amt <= 0.005) ci++
    if (ds[di].amt <= 0.005) di++
  }
  return out
})

const recent = computed(() => monthMovements.value.slice(0, 6))
</script>

<template>
  <div style="max-width: 1100px; margin: 0 auto; display: flex; flex-direction: column; gap: 18px">
    <div style="display: flex; justify-content: flex-end">
      <AppMonthPicker />
    </div>

    <!-- Stat grid -->
    <div class="stat-grid" style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 16px">
      <UiCard class="hero-stat" :pad="24">
        <div style="display: flex; justify-content: space-between; align-items: flex-start">
          <div style="font-size: 13px; color: var(--muted)">{{ $t('summary.totalSpent') }} · {{ monthLabel }}</div>
          <UiTag v-if="prevTotal" :tone="delta <= 0 ? 'accent' : 'muted'">
            {{ delta <= 0 ? '▼' : '▲' }} {{ $t('summary.vsPrev', { pct: Math.abs(delta) }) }}
          </UiTag>
        </div>
        <div class="tnum" style="font-size: 42px; font-weight: 700; letter-spacing: -0.02em; margin: 8px 0 16px">{{ $n(total, 'currency') }}</div>
        <div style="display: flex; gap: 26px; flex-wrap: wrap">
          <div><div class="tnum" style="font-weight: 600; color: var(--pos)">{{ $n(monthIncome, 'currency0') }}</div><div style="font-size: 12.5px; color: var(--muted)">{{ $t('summary.income') }}</div></div>
          <div><div class="tnum" style="font-weight: 600" :style="{ color: saldo >= 0 ? 'var(--pos)' : 'var(--neg)' }">{{ saldo >= 0 ? '+' : '' }}{{ $n(saldo, 'currency0') }}</div><div style="font-size: 12.5px; color: var(--muted)">{{ $t('summary.balance') }}</div></div>
          <div><div class="tnum" style="font-weight: 600; color: var(--accent)">{{ $n(quota, 'currency0') }}</div><div style="font-size: 12.5px; color: var(--muted)">{{ $t('balance.avgQuota') }}</div></div>
          <div><div class="tnum" style="font-weight: 600">{{ count }}</div><div style="font-size: 12.5px; color: var(--muted)">{{ $t('summary.movements') }}</div></div>
          <div><div class="tnum" style="font-weight: 600">{{ $n(avg, 'currency0') }}</div><div style="font-size: 12.5px; color: var(--muted)">{{ $t('summary.avgPerExpense') }}</div></div>
        </div>
      </UiCard>

      <UiCard v-for="t in topCats" :key="t.cat.id" :pad="20" hover>
        <div :style="{ width: '40px', height: '40px', borderRadius: '11px', display: 'grid', placeItems: 'center', marginBottom: '14px', background: `oklch(${isDark ? '0.34 0.045' : '0.94 0.035'} ${t.cat.hue})`, color: catColor(t.cat.hue, isDark) }">
          <UiIcon name="receipt" :size="20" />
        </div>
        <div style="font-size: 13px; color: var(--muted)">{{ cats.catLabel(t.cat.id) }}</div>
        <div class="tnum" style="font-size: 24px; font-weight: 700; margin-top: 2px">{{ $n(t.cents / 100, 'currency0') }}</div>
      </UiCard>
    </div>

    <!-- Two columns: by category + contribution vs average -->
    <div class="dash-cols" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px">
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

      <UiCard :pad="22">
        <UiSectionTitle>{{ $t('balance.contribVsAvg') }}</UiSectionTitle>
        <div style="display: flex; flex-direction: column; gap: 16px">
          <div v-for="c in contrib" :key="c.member.id">
            <div style="display: flex; align-items: center; gap: 11px; margin-bottom: 7px">
              <UiAvatar :member="c.member" :size="30" />
              <span style="flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 540; font-size: 14px">{{ firstName(c.member.name) }}</span>
              <div style="text-align: right; white-space: nowrap">
                <span class="tnum" style="font-weight: 600">{{ $n(c.paid, 'currency') }}</span>
                <span class="tnum" style="font-size: 12px; margin-left: 8px" :style="{ color: c.diff >= 0 ? 'var(--pos)' : 'var(--neg)' }">
                  {{ c.diff >= 0 ? '+' : '' }}{{ $n(c.diff, 'currency0') }}
                </span>
              </div>
            </div>
            <UiMiniBar :value="c.paid" :max="maxPaid" :color="catColor(c.member.hue, isDark)" />
          </div>
        </div>
      </UiCard>
    </div>

    <!-- Settle-up transfers -->
    <UiCard :pad="22">
      <UiSectionTitle>{{ $t('balance.toBalance') }}</UiSectionTitle>
      <p style="font-size: 13px; color: var(--muted); margin-bottom: 16px">{{ $t('balance.suggestion') }}</p>
      <div v-if="transfers.length" style="display: flex; flex-direction: column; gap: 10px">
        <div v-for="(t, i) in transfers" :key="i" style="display: flex; align-items: center; gap: 12px; padding: 12px 14px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface-2)">
          <UiAvatar :member="t.from" :size="30" />
          <span style="font-weight: 600; font-size: 14px">{{ firstName(t.from.name) }}</span>
          <div style="flex: 1; display: flex; align-items: center; justify-content: center; color: var(--muted)"><UiIcon name="arrowUR" :size="18" /></div>
          <span style="font-weight: 600; font-size: 14px">{{ firstName(t.to.name) }}</span>
          <UiAvatar :member="t.to" :size="30" />
          <span class="tnum" style="font-weight: 700; min-width: 90px; text-align: right">{{ $n(t.amt, 'currency') }}</span>
        </div>
      </div>
      <div v-else style="font-size: 13.5px; color: var(--muted)">{{ $t('balance.balanced') }}</div>
      <p style="font-size: 12px; color: var(--faint); margin-top: 16px">{{ $t('balance.note') }}</p>
    </UiCard>

    <!-- This month's income -->
    <UiCard :pad="22">
      <UiSectionTitle>
        {{ $t('balance.monthIncomes') }}
        <template #action><UiButton variant="ghost" icon="plus" @click="openNewIncome">{{ $t('balance.newIncome') }}</UiButton></template>
      </UiSectionTitle>
      <div v-if="monthIncomes.length">
        <AppIncomeRow v-for="i in monthIncomes" :key="i.id" :income="i" />
      </div>
      <UiEmptyState v-else icon="trend" :title="$t('balance.noIncomesTitle')" :sub="$t('balance.noIncomesSub')" />
    </UiCard>

    <!-- Recent movements (unified) -->
    <UiCard :pad="22">
      <UiSectionTitle>
        {{ $t('summary.recent') }}
        <template #action><NuxtLink to="/gastos" style="font-size: 13px; color: var(--accent); font-weight: 600">{{ $t('summary.viewAll') }}</NuxtLink></template>
      </UiSectionTitle>
      <div v-if="recent.length">
        <AppMovementRow v-for="mv in recent" :key="mv.kind + mv.id" :movement="mv" />
      </div>
      <UiEmptyState v-else :title="$t('summary.emptyRecentTitle')" :sub="$t('summary.emptyRecentSub')" />
    </UiCard>
  </div>
</template>
