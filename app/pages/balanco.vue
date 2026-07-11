<script setup lang="ts">
import { catColor, monthKey, firstName } from '~~/shared/config'

definePageMeta({ titleKey: 'nav.balance', subtitleKey: 'pageSub.balance' })
const store = useStore()
const selected = useMonth()
const { isDark } = useTweaks()
const { d } = useI18n()
const { openNewIncome } = useAppUi()

onMounted(async () => { await store.ensure(); syncMonth(selected, store.expenses.value) })
watch(() => store.expenses.value, (ex) => syncMonth(selected, ex))

const monthExpenses = computed(() => store.expenses.value.filter(e => monthKey(e.date) === selected.value))
const monthIncomes = computed(() => store.incomes.value.filter(i => monthKey(i.date) === selected.value))
const totalCents = computed(() => monthExpenses.value.reduce((a, e) => a + e.amountCents, 0))
const incomeCents = computed(() => monthIncomes.value.reduce((a, i) => a + i.amountCents, 0))
const saldoCents = computed(() => incomeCents.value - totalCents.value)
const members = computed(() => store.members.value)
const quotaCents = computed(() => members.value.length ? totalCents.value / members.value.length : 0)

const monthLabel = computed(() => {
  const [y, m] = (selected.value || '').split('-').map(Number)
  return m ? d(new Date(y, m - 1, 1), 'monthYear') : ''
})

const contrib = computed(() => {
  const map: Record<string, number> = {}
  for (const e of monthExpenses.value) map[e.userId] = (map[e.userId] || 0) + e.amountCents
  return members.value.map(m => {
    const paid = map[m.id] || 0
    return { member: m, paid, diff: paid - quotaCents.value }
  }).sort((a, b) => b.paid - a.paid)
})
const maxPaid = computed(() => Math.max(...contrib.value.map(c => c.paid), 1))

// Minimal transfer suggestion: debtors pay creditors up to the average.
const transfers = computed(() => {
  const creditors = contrib.value.filter(c => c.diff > 0.5).map(c => ({ id: c.member.id, name: c.member.name, member: c.member, amt: c.diff }))
  const debtors = contrib.value.filter(c => c.diff < -0.5).map(c => ({ id: c.member.id, name: c.member.name, member: c.member, amt: -c.diff }))
  const out: { from: typeof debtors[0]['member']; to: typeof creditors[0]['member']; cents: number }[] = []
  let ci = 0, di = 0
  const cs = creditors.map(c => ({ ...c })); const ds = debtors.map(d => ({ ...d }))
  while (ci < cs.length && di < ds.length) {
    const amt = Math.min(cs[ci].amt, ds[di].amt)
    if (amt > 0.5) out.push({ from: ds[di].member, to: cs[ci].member, cents: amt })
    cs[ci].amt -= amt; ds[di].amt -= amt
    if (cs[ci].amt <= 0.5) ci++
    if (ds[di].amt <= 0.5) di++
  }
  return out
})
</script>

<template>
  <div style="max-width: 920px; margin: 0 auto; display: flex; flex-direction: column; gap: 16px">
    <div style="display: flex; justify-content: flex-end"><AppMonthPicker /></div>

    <UiCard :pad="24">
      <div style="display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 16px">
        <div>
          <div style="font-size: 13px; color: var(--muted)">{{ $t('balance.income') }} · {{ monthLabel }}</div>
          <div class="tnum" style="font-size: 32px; font-weight: 700; letter-spacing: -0.02em; color: var(--pos)">{{ $n(incomeCents / 100, 'currency') }}</div>
        </div>
        <div>
          <div style="font-size: 13px; color: var(--muted)">{{ $t('balance.totalHouse') }}</div>
          <div class="tnum" style="font-size: 32px; font-weight: 700; letter-spacing: -0.02em">{{ $n(totalCents / 100, 'currency') }}</div>
        </div>
        <div>
          <div style="font-size: 13px; color: var(--muted)">{{ $t('balance.monthBalance') }}</div>
          <div class="tnum" style="font-size: 32px; font-weight: 700; letter-spacing: -0.02em" :style="{ color: saldoCents >= 0 ? 'var(--pos)' : 'var(--neg)' }">
            {{ saldoCents >= 0 ? '+' : '' }}{{ $n(saldoCents / 100, 'currency') }}
          </div>
        </div>
        <div style="text-align: right">
          <div style="font-size: 13px; color: var(--muted)">{{ $t('balance.avgQuota') }}</div>
          <div class="tnum" style="font-size: 32px; font-weight: 700; letter-spacing: -0.02em; color: var(--accent)">{{ $n(quotaCents / 100, 'currency') }}</div>
        </div>
      </div>
    </UiCard>

    <UiCard :pad="22">
      <UiSectionTitle>
        {{ $t('balance.monthIncomes') }}
        <template #action>
          <UiButton variant="ghost" icon="plus" @click="openNewIncome">{{ $t('balance.newIncome') }}</UiButton>
        </template>
      </UiSectionTitle>
      <div v-if="monthIncomes.length">
        <AppIncomeRow v-for="i in monthIncomes" :key="i.id" :income="i" />
      </div>
      <UiEmptyState v-else icon="trend" :title="$t('balance.noIncomesTitle')" :sub="$t('balance.noIncomesSub')" />
    </UiCard>

    <UiCard :pad="22">
      <UiSectionTitle>{{ $t('balance.contribVsAvg') }}</UiSectionTitle>
      <div style="display: flex; flex-direction: column; gap: 18px">
        <div v-for="c in contrib" :key="c.member.id" style="display: flex; align-items: center; gap: 14px">
          <UiAvatar :member="c.member" :size="38" />
          <div style="flex: 1; min-width: 0">
            <div style="font-weight: 600; font-size: 14.5px; margin-bottom: 6px">{{ c.member.name }}</div>
            <UiMiniBar :value="c.paid" :max="maxPaid" :color="catColor(c.member.hue, isDark)" />
          </div>
          <div style="text-align: right; min-width: 130px">
            <div class="tnum" style="font-weight: 600">{{ $n(c.paid / 100, 'currency') }}</div>
            <div class="tnum" style="font-size: 12px; margin-top: 2px" :style="{ color: c.diff >= 0 ? 'var(--pos)' : 'var(--neg)' }">
              {{ c.diff >= 0 ? '+' : '' }}{{ $n(c.diff / 100, 'currency') }} · {{ c.diff >= 0 ? $t('balance.above') : $t('balance.below') }}
            </div>
          </div>
        </div>
      </div>
    </UiCard>

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
          <span class="tnum" style="font-weight: 700; min-width: 90px; text-align: right">{{ $n(t.cents / 100, 'currency') }}</span>
        </div>
      </div>
      <div v-else style="font-size: 13.5px; color: var(--muted)">{{ $t('balance.balanced') }}</div>
      <p style="font-size: 12px; color: var(--faint); margin-top: 16px">{{ $t('balance.note') }}</p>
    </UiCard>
  </div>
</template>
