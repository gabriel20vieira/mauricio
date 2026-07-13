<script setup lang="ts">
import { catColor, monthKey, firstName } from '~~/shared/config'

definePageMeta({ titleKey: 'nav.reports', subtitleKey: 'pageSub.reports' })
const store = useStore()
const cats = useCategories()
const selected = useMonth()
const { isDark } = useTweaks()
const { locale } = useI18n()

onMounted(async () => { await store.ensure(); syncMonth(selected, store.expenses.value) })
watch(() => store.expenses.value, (ex) => syncMonth(selected, ex))

// ---- annual evolution (12 months of a selected year) ----
const years = computed(() => {
  const set = new Set<string>()
  for (const e of store.expenses.value) set.add(e.date.slice(0, 4))
  for (const i of store.incomes.value) set.add(i.date.slice(0, 4))
  set.add(String(new Date().getFullYear()))
  return [...set].sort().reverse()
})
const year = ref('')
watch(years, (ys) => { if (!year.value || !ys.includes(year.value)) year.value = ys[0] }, { immediate: true })

const annual = computed(() => {
  const exp: Record<string, number> = {}
  const inc: Record<string, number> = {}
  for (const e of store.expenses.value) if (e.date.slice(0, 4) === year.value) exp[monthKey(e.date)] = (exp[monthKey(e.date)] || 0) + e.amountCents
  for (const i of store.incomes.value) if (i.date.slice(0, 4) === year.value) inc[monthKey(i.date)] = (inc[monthKey(i.date)] || 0) + i.amountCents
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
const maxExpense = computed(() => Math.max(...annual.value.map(a => a.expense), 1))
const hasAnnual = computed(() => annual.value.some(a => a.expense || a.income))

// All-time by category, with per-subcategory breakdown (derived from real data:
// includes hidden cats/subs and a '(—)' bucket for expenses with no subcategory).
const totalCents = computed(() => store.expenses.value.reduce((a, e) => a + e.amountCents, 0))
const byCat = computed(() => {
  const acc: Record<string, { total: number, subs: Record<string, number> }> = {}
  for (const e of store.expenses.value) {
    const a = acc[e.cat] || (acc[e.cat] = { total: 0, subs: {} })
    a.total += e.amountCents
    const sk = e.sub || ''
    a.subs[sk] = (a.subs[sk] || 0) + e.amountCents
  }
  return Object.entries(acc).map(([catId, v]) => ({
    catId,
    cat: cats.byId.value[catId],
    hue: cats.hue(catId),
    label: cats.catLabel(catId),
    cents: v.total,
    subs: Object.entries(v.subs)
      .map(([subId, cents]) => ({ subId, label: subId ? cats.subLabel(catId, subId) : '(—)', cents }))
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

const byPerson = computed(() => {
  const map: Record<string, number> = {}
  for (const e of store.expenses.value) map[e.userId] = (map[e.userId] || 0) + e.amountCents
  return store.members.value.map(m => ({ member: m, cents: map[m.id] || 0 })).sort((a, b) => b.cents - a.cents)
})
const maxPerson = computed(() => Math.max(...byPerson.value.map(p => p.cents), 1))

function printReport() {
  if (!selected.value) return
  window.open(`/relatorios-imprimir?mes=${selected.value}`, '_blank')
}
</script>

<template>
  <div style="max-width: 1000px; margin: 0 auto; display: flex; flex-direction: column; gap: 16px">
    <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap; justify-content: flex-end">
      <AppMonthPicker />
      <UiButton variant="outline" icon="receipt" @click="printReport">{{ $t('reports.print') }}</UiButton>
    </div>

    <UiCard :pad="22">
      <UiSectionTitle>
        {{ $t('reports.annualEvolution') }}
        <template #action>
          <div style="width: 110px">
            <UiSelect :model-value="year" @update:model-value="year = $event">
              <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
            </UiSelect>
          </div>
        </template>
      </UiSectionTitle>
      <div v-if="hasAnnual" style="display: flex; align-items: flex-end; gap: 6px; height: 210px; padding-top: 18px">
        <div v-for="a in annual" :key="a.mk"
          style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; height: 100%; justify-content: flex-end; min-width: 0">
          <div class="tnum" style="font-size: 10.5px; font-weight: 600; color: var(--ink-2); white-space: nowrap">{{ a.expense ? $n(a.expense / 100, 'currency0') : '' }}</div>
          <div :title="$n(a.expense / 100, 'currency')"
            :style="{ width: '100%', maxWidth: '40px', height: `${(a.expense / maxExpense) * 100}%`, minHeight: a.expense ? '4px' : '0', background: 'var(--accent)', borderRadius: '6px 6px 3px 3px' }" />
          <div style="font-size: 11px; color: var(--muted); font-weight: 500; text-transform: capitalize">{{ a.label }}</div>
          <div class="tnum" style="font-size: 10.5px; font-weight: 600; white-space: nowrap"
            :style="{ color: a.saldo > 0 ? 'var(--pos)' : a.saldo < 0 ? 'var(--neg)' : 'var(--faint)' }">
            {{ (a.income || a.expense) ? `${a.saldo >= 0 ? '+' : ''}${$n(a.saldo / 100, 'currency0')}` : '—' }}
          </div>
        </div>
      </div>
      <UiEmptyState v-else icon="chart" :title="$t('reports.noData')" :sub="$t('reports.noDataSub')" />
    </UiCard>

    <div class="dash-cols" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px">
      <UiCard :pad="22">
        <UiSectionTitle>{{ $t('reports.byCategory') }}</UiSectionTitle>
        <div style="display: flex; flex-direction: column; gap: 14px">
          <div v-for="x in byCat" :key="x.catId">
            <div style="display: flex; align-items: center; gap: 9px; margin-bottom: 6px; font-size: 13.5px; cursor: pointer" role="button"
              :aria-expanded="expanded.has(x.catId)" @click="toggleCat(x.catId)">
              <UiIcon :name="expanded.has(x.catId) ? 'chevDown' : 'chevRight'" :size="14" style="color: var(--muted); flex-shrink: 0" />
              <span :style="{ width: '9px', height: '9px', borderRadius: '50%', background: catColor(x.hue, isDark), flexShrink: 0 }" />
              <span style="flex: 1">{{ x.label }}</span>
              <span class="tnum" style="font-weight: 600">{{ $n(x.cents / 100, 'currency0') }}</span>
              <span class="tnum" style="color: var(--muted); width: 38px; text-align: right">{{ Math.round((x.cents / (totalCents || 1)) * 100) }}%</span>
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
