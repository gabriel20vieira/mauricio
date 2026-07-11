<script setup lang="ts">
import { catColor, monthKey, firstName } from '~~/shared/config'

definePageMeta({ titleKey: 'nav.summary', subtitleKey: 'pageSub.summary' })
const store = useStore()
const cats = useCategories()
const selected = useMonth()
const { isDark } = useTweaks()
const { d } = useI18n()

onMounted(async () => {
  await store.ensure()
  syncMonth(selected, store.expenses.value)
})
watch(() => store.expenses.value, (ex) => syncMonth(selected, ex))

const monthExpenses = computed(() => store.expenses.value.filter(e => monthKey(e.date) === selected.value))
const total = computed(() => monthExpenses.value.reduce((a, e) => a + e.amountCents, 0) / 100)
const count = computed(() => monthExpenses.value.length)
const avg = computed(() => count.value ? total.value / count.value : 0)
const monthIncome = computed(() => store.incomes.value.filter(i => monthKey(i.date) === selected.value).reduce((a, i) => a + i.amountCents, 0) / 100)
const saldo = computed(() => monthIncome.value - total.value)

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

// By person
const byPerson = computed(() => {
  const map: Record<string, number> = {}
  for (const e of monthExpenses.value) map[e.userId] = (map[e.userId] || 0) + e.amountCents
  return store.members.value.map(m => ({ member: m, cents: map[m.id] || 0 })).sort((a, b) => b.cents - a.cents)
})
const maxPerson = computed(() => Math.max(...byPerson.value.map(p => p.cents), 1))

const recent = computed(() => monthExpenses.value.slice(0, 6))
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
        <div style="display: flex; gap: 28px; flex-wrap: wrap">
          <div><div class="tnum" style="font-weight: 600; color: var(--pos)">{{ $n(monthIncome, 'currency0') }}</div><div style="font-size: 12.5px; color: var(--muted)">{{ $t('summary.income') }}</div></div>
          <div><div class="tnum" style="font-weight: 600" :style="{ color: saldo >= 0 ? 'var(--pos)' : 'var(--neg)' }">{{ saldo >= 0 ? '+' : '' }}{{ $n(saldo, 'currency0') }}</div><div style="font-size: 12.5px; color: var(--muted)">{{ $t('summary.balance') }}</div></div>
          <div><div class="tnum" style="font-weight: 600">{{ count }}</div><div style="font-size: 12.5px; color: var(--muted)">{{ $t('summary.movements') }}</div></div>
          <div><div class="tnum" style="font-weight: 600">{{ $n(avg, 'currency0') }}</div><div style="font-size: 12.5px; color: var(--muted)">{{ $t('summary.avgPerExpense') }}</div></div>
          <div><div class="tnum" style="font-weight: 600">{{ $n(prevTotal, 'currency0') }}</div><div style="font-size: 12.5px; color: var(--muted)">{{ $t('summary.prevMonth') }}</div></div>
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

    <!-- Two columns -->
    <div class="dash-cols" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px">
      <UiCard :pad="22">
        <UiSectionTitle>
          {{ $t('summary.byCategory') }}
          <template #action><NuxtLink to="/relatorios" style="font-size: 13px; color: var(--accent); font-weight: 600">{{ $t('summary.viewReports') }}</NuxtLink></template>
        </UiSectionTitle>
        <div v-if="byCat.length" style="display: flex; align-items: center; gap: 24px">
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
              <span style="flex: 1">{{ cats.catLabel(x.cat.id) }}</span>
              <span class="tnum" style="font-weight: 600">{{ $n(x.cents / 100, 'currency0') }}</span>
              <span class="tnum" style="color: var(--muted); width: 38px; text-align: right">{{ Math.round((x.cents / (total * 100 || 1)) * 100) }}%</span>
            </div>
          </div>
        </div>
        <UiEmptyState v-else :title="$t('summary.emptyTitle')" :sub="$t('summary.emptySub')" />
      </UiCard>

      <UiCard :pad="22">
        <UiSectionTitle>
          {{ $t('summary.contribByPerson') }}
          <template #action><NuxtLink to="/balanco" style="font-size: 13px; color: var(--accent); font-weight: 600">{{ $t('summary.balanceLink') }}</NuxtLink></template>
        </UiSectionTitle>
        <div style="display: flex; flex-direction: column; gap: 16px">
          <div v-for="p in byPerson" :key="p.member.id">
            <div style="display: flex; align-items: center; gap: 11px; margin-bottom: 7px">
              <UiAvatar :member="p.member" :size="30" />
              <span style="flex: 1; font-weight: 540; font-size: 14px">{{ firstName(p.member.name) }}</span>
              <span class="tnum" style="font-weight: 600">{{ $n(p.cents / 100, 'currency') }}</span>
            </div>
            <UiMiniBar :value="p.cents" :max="maxPerson" :color="catColor(p.member.hue, isDark)" />
          </div>
        </div>
      </UiCard>
    </div>

    <!-- Recent -->
    <UiCard :pad="22">
      <UiSectionTitle>
        {{ $t('summary.recent') }}
        <template #action><NuxtLink to="/gastos" style="font-size: 13px; color: var(--accent); font-weight: 600">{{ $t('summary.viewAll') }}</NuxtLink></template>
      </UiSectionTitle>
      <div v-if="recent.length">
        <AppExpenseRow v-for="e in recent" :key="e.id" :expense="e" />
      </div>
      <UiEmptyState v-else :title="$t('summary.emptyRecentTitle')" :sub="$t('summary.emptyRecentSub')" />
    </UiCard>
  </div>
</template>
