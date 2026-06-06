<script setup lang="ts">
import { CAT_BY_ID, CATEGORIES, catColor, euro, euro0, MONTHS_PT_LONG, monthKey, firstName } from '~~/shared/config'

definePageMeta({ title: 'Resumo', subtitle: 'Visão geral das contas da casa' })
const store = useStore()
const selected = useMonth()
const { isDark } = useTweaks()

onMounted(async () => {
  await store.ensure()
  syncMonth(selected, store.expenses.value)
})
watch(() => store.expenses.value, (ex) => syncMonth(selected, ex))

const monthExpenses = computed(() => store.expenses.value.filter(e => monthKey(e.date) === selected.value))
const total = computed(() => monthExpenses.value.reduce((a, e) => a + e.amountCents, 0) / 100)
const count = computed(() => monthExpenses.value.length)
const avg = computed(() => count.value ? total.value / count.value : 0)

const prevKey = computed(() => {
  const [y, m] = selected.value.split('-').map(Number)
  const d = m === 1 ? { y: y - 1, m: 12 } : { y, m: m - 1 }
  return `${d.y}-${String(d.m).padStart(2, '0')}`
})
const prevTotal = computed(() => store.expenses.value.filter(e => monthKey(e.date) === prevKey.value).reduce((a, e) => a + e.amountCents, 0) / 100)
const delta = computed(() => prevTotal.value ? Math.round(((total.value - prevTotal.value) / prevTotal.value) * 100) : 0)

const monthLabel = computed(() => {
  const [y, m] = selected.value.split('-').map(Number)
  return `${MONTHS_PT_LONG[m - 1]} ${y}`
})

// By category
const byCat = computed(() => {
  const map: Record<string, number> = {}
  for (const e of monthExpenses.value) map[e.cat] = (map[e.cat] || 0) + e.amountCents
  return CATEGORIES.map(c => ({ cat: c, cents: map[c.id] || 0 }))
    .filter(x => x.cents > 0).sort((a, b) => b.cents - a.cents)
})
const donutSegments = computed(() => byCat.value.map(x => ({ value: x.cents, color: catColor(x.cat.hue, isDark.value), label: x.cat.label })))
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
          <div style="font-size: 13px; color: var(--muted)">Total gasto · {{ monthLabel }}</div>
          <UiTag v-if="prevTotal" :tone="delta <= 0 ? 'accent' : 'muted'">
            {{ delta <= 0 ? '▼' : '▲' }} {{ Math.abs(delta) }} % vs mês anterior
          </UiTag>
        </div>
        <div class="tnum" style="font-size: 42px; font-weight: 700; letter-spacing: -0.02em; margin: 8px 0 16px">{{ euro(total) }}</div>
        <div style="display: flex; gap: 28px">
          <div><div class="tnum" style="font-weight: 600">{{ count }}</div><div style="font-size: 12.5px; color: var(--muted)">Movimentos</div></div>
          <div><div class="tnum" style="font-weight: 600">{{ euro0(avg) }}</div><div style="font-size: 12.5px; color: var(--muted)">Média / gasto</div></div>
          <div><div class="tnum" style="font-weight: 600">{{ euro0(prevTotal) }}</div><div style="font-size: 12.5px; color: var(--muted)">Mês anterior</div></div>
        </div>
      </UiCard>

      <UiCard v-for="t in topCats" :key="t.cat.id" :pad="20" hover>
        <div :style="{ width: '40px', height: '40px', borderRadius: '11px', display: 'grid', placeItems: 'center', marginBottom: '14px', background: `oklch(${isDark ? '0.34 0.045' : '0.94 0.035'} ${t.cat.hue})`, color: catColor(t.cat.hue, isDark) }">
          <UiIcon name="receipt" :size="20" />
        </div>
        <div style="font-size: 13px; color: var(--muted)">{{ t.cat.label }}</div>
        <div class="tnum" style="font-size: 24px; font-weight: 700; margin-top: 2px">{{ euro0(t.cents / 100) }}</div>
      </UiCard>
    </div>

    <!-- Two columns -->
    <div class="dash-cols" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px">
      <UiCard :pad="22">
        <UiSectionTitle>
          Gastos por categoria
          <template #action><NuxtLink to="/relatorios" style="font-size: 13px; color: var(--accent); font-weight: 600">Ver relatórios ›</NuxtLink></template>
        </UiSectionTitle>
        <div v-if="byCat.length" style="display: flex; align-items: center; gap: 24px">
          <UiDonut :segments="donutSegments" :size="168">
            <template #center>
              <div>
                <div style="font-size: 12px; color: var(--muted)">Total</div>
                <div class="tnum" style="font-size: 19px; font-weight: 700">{{ euro0(total) }}</div>
              </div>
            </template>
          </UiDonut>
          <div style="flex: 1; display: flex; flex-direction: column; gap: 10px">
            <div v-for="x in byCat.slice(0, 5)" :key="x.cat.id" style="display: flex; align-items: center; gap: 10px; font-size: 13.5px">
              <UiCatDot :cat="x.cat" :size="9" />
              <span style="flex: 1">{{ x.cat.label }}</span>
              <span class="tnum" style="font-weight: 600">{{ euro0(x.cents / 100) }}</span>
              <span class="tnum" style="color: var(--muted); width: 38px; text-align: right">{{ Math.round((x.cents / (total * 100 || 1)) * 100) }}%</span>
            </div>
          </div>
        </div>
        <UiEmptyState v-else title="Sem gastos neste mês" sub="Adicione o primeiro gasto." />
      </UiCard>

      <UiCard :pad="22">
        <UiSectionTitle>
          Contribuição por pessoa
          <template #action><NuxtLink to="/balanco" style="font-size: 13px; color: var(--accent); font-weight: 600">Balanço ›</NuxtLink></template>
        </UiSectionTitle>
        <div style="display: flex; flex-direction: column; gap: 16px">
          <div v-for="p in byPerson" :key="p.member.id">
            <div style="display: flex; align-items: center; gap: 11px; margin-bottom: 7px">
              <UiAvatar :member="p.member" :size="30" />
              <span style="flex: 1; font-weight: 540; font-size: 14px">{{ firstName(p.member.name) }}</span>
              <span class="tnum" style="font-weight: 600">{{ euro(p.cents / 100) }}</span>
            </div>
            <UiMiniBar :value="p.cents" :max="maxPerson" :color="catColor(p.member.hue, isDark)" />
          </div>
        </div>
      </UiCard>
    </div>

    <!-- Recent -->
    <UiCard :pad="22">
      <UiSectionTitle>
        Movimentos recentes
        <template #action><NuxtLink to="/gastos" style="font-size: 13px; color: var(--accent); font-weight: 600">Ver todos ›</NuxtLink></template>
      </UiSectionTitle>
      <div v-if="recent.length">
        <AppExpenseRow v-for="e in recent" :key="e.id" :expense="e" />
      </div>
      <UiEmptyState v-else title="Ainda sem movimentos" sub="Os gastos deste mês aparecem aqui." />
    </UiCard>
  </div>
</template>
