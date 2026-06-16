<script setup lang="ts">
import { catColor, monthKey, firstName } from '~~/shared/config'

definePageMeta({ titleKey: 'nav.reports', subtitleKey: 'pageSub.reports' })
const store = useStore()
const cats = useCategories()
const { isDark } = useTweaks()
const { locale } = useI18n()
onMounted(() => store.ensure())

// Last 6 months evolution
const monthly = computed(() => {
  const map: Record<string, number> = {}
  for (const e of store.expenses.value) map[monthKey(e.date)] = (map[monthKey(e.date)] || 0) + e.amountCents
  const keys = Object.keys(map).sort().slice(-6)
  return keys.map(k => {
    const [, m] = k.split('-').map(Number)
    return { label: new Intl.DateTimeFormat(locale.value, { month: 'short' }).format(new Date(2000, m - 1, 1)), value: map[k] / 100, color: 'var(--accent)' }
  })
})

// All-time by category
const totalCents = computed(() => store.expenses.value.reduce((a, e) => a + e.amountCents, 0))
const byCat = computed(() => {
  const map: Record<string, number> = {}
  for (const e of store.expenses.value) map[e.cat] = (map[e.cat] || 0) + e.amountCents
  return cats.active.value.map(c => ({ cat: c, cents: map[c.id] || 0 })).filter(x => x.cents > 0).sort((a, b) => b.cents - a.cents)
})
const maxCat = computed(() => Math.max(...byCat.value.map(x => x.cents), 1))

const byPerson = computed(() => {
  const map: Record<string, number> = {}
  for (const e of store.expenses.value) map[e.userId] = (map[e.userId] || 0) + e.amountCents
  return store.members.value.map(m => ({ member: m, cents: map[m.id] || 0 })).sort((a, b) => b.cents - a.cents)
})
const maxPerson = computed(() => Math.max(...byPerson.value.map(p => p.cents), 1))
</script>

<template>
  <div style="max-width: 1000px; margin: 0 auto; display: flex; flex-direction: column; gap: 16px">
    <UiCard :pad="22">
      <UiSectionTitle>{{ $t('reports.monthlyEvolution') }}</UiSectionTitle>
      <UiBarChart v-if="monthly.length" :data="monthly" :height="200" />
      <UiEmptyState v-else icon="chart" :title="$t('reports.noData')" :sub="$t('reports.noDataSub')" />
    </UiCard>

    <div class="dash-cols" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px">
      <UiCard :pad="22">
        <UiSectionTitle>{{ $t('reports.byCategory') }}</UiSectionTitle>
        <div style="display: flex; flex-direction: column; gap: 14px">
          <div v-for="x in byCat" :key="x.cat.id">
            <div style="display: flex; align-items: center; gap: 9px; margin-bottom: 6px; font-size: 13.5px">
              <UiCatDot :cat="x.cat" :size="9" /><span style="flex: 1">{{ cats.catLabel(x.cat.id) }}</span>
              <span class="tnum" style="font-weight: 600">{{ $n(x.cents / 100, 'currency0') }}</span>
              <span class="tnum" style="color: var(--muted); width: 38px; text-align: right">{{ Math.round((x.cents / (totalCents || 1)) * 100) }}%</span>
            </div>
            <UiMiniBar :value="x.cents" :max="maxCat" :color="catColor(x.cat.hue, isDark)" />
          </div>
        </div>
      </UiCard>

      <UiCard :pad="22">
        <UiSectionTitle>{{ $t('reports.byPerson') }}</UiSectionTitle>
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
  </div>
</template>
