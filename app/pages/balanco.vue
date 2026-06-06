<script setup lang="ts">
import { catColor, euro, MONTHS_PT_LONG, monthKey, firstName } from '~~/shared/config'

definePageMeta({ title: 'Balanço', subtitle: 'Quem pagou quanto este mês' })
const store = useStore()
const selected = useMonth()
const { isDark } = useTweaks()

onMounted(async () => { await store.ensure(); syncMonth(selected, store.expenses.value) })
watch(() => store.expenses.value, (ex) => syncMonth(selected, ex))

const monthExpenses = computed(() => store.expenses.value.filter(e => monthKey(e.date) === selected.value))
const totalCents = computed(() => monthExpenses.value.reduce((a, e) => a + e.amountCents, 0))
const members = computed(() => store.members.value)
const quotaCents = computed(() => members.value.length ? totalCents.value / members.value.length : 0)

const monthLabel = computed(() => {
  const [y, m] = (selected.value || '').split('-').map(Number)
  return m ? `${MONTHS_PT_LONG[m - 1]} ${y}` : ''
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
          <div style="font-size: 13px; color: var(--muted)">Total da casa · {{ monthLabel }}</div>
          <div class="tnum" style="font-size: 36px; font-weight: 700; letter-spacing: -0.02em">{{ euro(totalCents / 100) }}</div>
        </div>
        <div style="text-align: right">
          <div style="font-size: 13px; color: var(--muted)">Quota média por pessoa</div>
          <div class="tnum" style="font-size: 36px; font-weight: 700; letter-spacing: -0.02em; color: var(--accent)">{{ euro(quotaCents / 100) }}</div>
        </div>
      </div>
    </UiCard>

    <UiCard :pad="22">
      <UiSectionTitle>Contribuição vs. média</UiSectionTitle>
      <div style="display: flex; flex-direction: column; gap: 18px">
        <div v-for="c in contrib" :key="c.member.id" style="display: flex; align-items: center; gap: 14px">
          <UiAvatar :member="c.member" :size="38" />
          <div style="flex: 1; min-width: 0">
            <div style="font-weight: 600; font-size: 14.5px; margin-bottom: 6px">{{ c.member.name }}</div>
            <UiMiniBar :value="c.paid" :max="maxPaid" :color="catColor(c.member.hue, isDark)" />
          </div>
          <div style="text-align: right; min-width: 130px">
            <div class="tnum" style="font-weight: 600">{{ euro(c.paid / 100) }}</div>
            <div class="tnum" style="font-size: 12px; margin-top: 2px" :style="{ color: c.diff >= 0 ? 'var(--pos)' : 'var(--neg)' }">
              {{ c.diff >= 0 ? '+' : '' }}{{ euro(c.diff / 100) }} · {{ c.diff >= 0 ? 'acima' : 'abaixo' }} da média
            </div>
          </div>
        </div>
      </div>
    </UiCard>

    <UiCard :pad="22">
      <UiSectionTitle>Para equilibrar as contas</UiSectionTitle>
      <p style="font-size: 13px; color: var(--muted); margin-bottom: 16px">Sugestão para que todos fiquem na quota média (transferências mínimas):</p>
      <div v-if="transfers.length" style="display: flex; flex-direction: column; gap: 10px">
        <div v-for="(t, i) in transfers" :key="i" style="display: flex; align-items: center; gap: 12px; padding: 12px 14px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface-2)">
          <UiAvatar :member="t.from" :size="30" />
          <span style="font-weight: 600; font-size: 14px">{{ firstName(t.from.name) }}</span>
          <div style="flex: 1; display: flex; align-items: center; justify-content: center; color: var(--muted)"><UiIcon name="arrowUR" :size="18" /></div>
          <span style="font-weight: 600; font-size: 14px">{{ firstName(t.to.name) }}</span>
          <UiAvatar :member="t.to" :size="30" />
          <span class="tnum" style="font-weight: 700; min-width: 90px; text-align: right">{{ euro(t.cents / 100) }}</span>
        </div>
      </div>
      <div v-else style="font-size: 13.5px; color: var(--muted)">As contas já estão equilibradas. 🎉</div>
      <p style="font-size: 12px; color: var(--faint); margin-top: 16px">Apenas uma sugestão — a casa regista gastos sem divisão automática.</p>
    </UiCard>
  </div>
</template>
