<script setup lang="ts">
import { monthKey } from '~~/shared/config'

definePageMeta({ titleKey: 'nav.expenses', subtitleKey: 'pageSub.expenses' })
const store = useStore()
const cats = useCategories()
const activeCats = cats.active // top-level binding so the template unwraps the ref
const { openNewExpense } = useAppUi()
onMounted(() => store.ensure())

const q = ref('')
const fCat = ref('')
const fWho = ref('')
const fMonth = ref('')
const sort = ref<'date' | 'amount'>('date')

const months = computed(() => [...new Set(store.expenses.value.map(e => monthKey(e.date)))].sort().reverse())

const filtered = computed(() => {
  let rows = store.expenses.value.slice()
  if (q.value.trim()) {
    const s = q.value.toLowerCase()
    rows = rows.filter(e => e.note.toLowerCase().includes(s))
  }
  if (fCat.value) rows = rows.filter(e => e.cat === fCat.value)
  if (fWho.value) rows = rows.filter(e => e.userId === fWho.value)
  if (fMonth.value) rows = rows.filter(e => monthKey(e.date) === fMonth.value)
  rows.sort((a, b) => sort.value === 'amount' ? b.amountCents - a.amountCents : (a.date < b.date ? 1 : -1))
  return rows
})
const totalShown = computed(() => filtered.value.reduce((a, e) => a + e.amountCents, 0) / 100)

function clearFilters() { q.value = ''; fCat.value = ''; fWho.value = ''; fMonth.value = ''; sort.value = 'date' }
</script>

<template>
  <div style="max-width: 1000px; margin: 0 auto; display: flex; flex-direction: column; gap: 16px">
    <UiCard :pad="18">
      <div style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center">
        <div style="position: relative; flex: 1; min-width: 200px">
          <UiIcon name="search" :size="17" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--muted)" />
          <input v-model="q" :placeholder="$t('expenses.searchPlaceholder')"
            style="width: 100%; padding: 10px 12px 10px 36px; border-radius: var(--radius-sm); font-size: 14px; border: 1px solid var(--border-2); background: var(--surface); color: var(--ink); outline: none" />
        </div>
        <div style="width: 150px">
          <UiSelect v-model="fCat"><option value="">{{ $t('expenses.category') }}</option><option v-for="c in activeCats" :key="c.id" :value="c.id">{{ cats.catLabel(c.id) }}</option></UiSelect>
        </div>
        <div style="width: 140px">
          <UiSelect v-model="fWho"><option value="">{{ $t('expenses.person') }}</option><option v-for="m in store.members.value" :key="m.id" :value="m.id">{{ m.name }}</option></UiSelect>
        </div>
        <div style="width: 130px">
          <UiSelect v-model="fMonth"><option value="">{{ $t('expenses.month') }}</option><option v-for="mk in months" :key="mk" :value="mk">{{ mk }}</option></UiSelect>
        </div>
        <UiSegmented v-model="sort" size="sm" :options="[{ value: 'date', label: $t('expenses.sortDate') }, { value: 'amount', label: $t('expenses.sortAmount') }]" />
        <UiButton variant="primary" icon="plus" @click="openNewExpense">{{ $t('common.new') }}</UiButton>
      </div>
    </UiCard>

    <UiCard :pad="22">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px">
        <div style="font-size: 13.5px; color: var(--muted)">{{ $t('expenses.count', { n: filtered.length }) }}</div>
        <div style="display: flex; align-items: center; gap: 10px">
          <span class="tnum" style="font-weight: 700; font-size: 15px">{{ $n(totalShown, 'currency') }}</span>
          <button v-if="q || fCat || fWho || fMonth" style="font-size: 12.5px; color: var(--accent); background: none; border: none; font-weight: 600" @click="clearFilters">{{ $t('expenses.clearFilters') }}</button>
        </div>
      </div>
      <div v-if="filtered.length">
        <AppExpenseRow v-for="e in filtered" :key="e.id" :expense="e" />
      </div>
      <UiEmptyState v-else :title="$t('expenses.noResultsTitle')" :sub="$t('expenses.noResultsSub')" />
    </UiCard>
  </div>
</template>
