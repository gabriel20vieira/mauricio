<script setup lang="ts">
import { METHODS, catColor, catSoft } from '~~/shared/config'

const { t } = useI18n()
const { expenseModal, closeExpense } = useAppUi()
const store = useStore()
const cats = useCategories()
// Top-level binding so Vue auto-unwraps the ref in the template (`cats.active`
// is a nested ref on a plain object and would NOT unwrap in v-for).
const activeCats = cats.active
const { user } = useUserSession()
const { isDark } = useTweaks()

const editing = computed(() => expenseModal.value.editing)
const open = computed(() => expenseModal.value.open)
const isAdmin = computed(() => user.value?.role === 'admin')

const today = new Date().toISOString().slice(0, 10)
const defaultCat = () => cats.active.value[0]?.id ?? ''
const form = reactive({
  amount: '', cat: '', sub: '', date: today, who: user.value?.id ?? '', method: 'Cartão', note: '',
})
const error = ref('')
const saving = ref(false)

watch(open, (o) => {
  if (!o) return
  error.value = ''
  catQuery.value = ''
  const e = editing.value
  if (e) {
    form.amount = (e.amountCents / 100).toFixed(2)
    form.cat = e.cat; form.sub = e.sub; form.date = e.date
    form.who = e.userId; form.method = e.method || 'Cartão'; form.note = e.note
  } else {
    form.amount = ''; form.cat = defaultCat(); form.sub = ''; form.date = today
    form.who = user.value?.id ?? ''; form.method = 'Cartão'; form.note = ''
  }
})

// One flat list: the category on its own, then each subcategory as
// "Category - Subcategory". Picking an option sets both fields at once.
const catOptions = computed(() => activeCats.value.flatMap((c) => {
  const label = cats.catLabel(c.id)
  return [
    { key: c.id, cat: c.id, sub: '', hue: c.hue, label },
    ...cats.activeSubs(c.id).map(s => ({
      key: `${c.id}/${s.id}`, cat: c.id, sub: s.id, hue: c.hue,
      label: `${label} - ${cats.subLabel(c.id, s.id)}`,
    })),
  ]
}))

// Search matches the full "Category - Subcategory" string.
const catQuery = ref('')
const filteredCats = computed(() => {
  const q = catQuery.value.trim().toLowerCase()
  if (!q) return catOptions.value
  return catOptions.value.filter(o => o.label.toLowerCase().includes(q))
})

// A normal user can only edit/create their own expenses.
const canChangeWho = computed(() => isAdmin.value)
const lockedOther = computed(() => !!editing.value && !isAdmin.value && editing.value.userId !== user.value?.id)

function chipStyle(active: boolean, hue: number) {
  return {
    display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: '99px',
    fontSize: '13px', fontWeight: 530, cursor: 'pointer', transition: 'all 0.14s',
    border: '1px solid ' + (active ? 'transparent' : 'var(--border-2)'),
    background: active ? catSoft(hue, isDark.value) : 'transparent',
    color: active ? catColor(hue, isDark.value) : 'var(--ink-2)',
  }
}

async function submit() {
  error.value = ''
  const amount = parseFloat(form.amount.replace(',', '.'))
  if (!amount || amount <= 0) { error.value = t('expenseModal.errAmount'); return }
  saving.value = true
  try {
    const body = {
      date: form.date, amount, cat: form.cat, sub: form.sub, note: form.note, method: form.method,
      who: canChangeWho.value ? form.who : undefined,
    }
    if (editing.value) await store.updateExpense(editing.value.id, body)
    else await store.addExpense(body)
    closeExpense()
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.statusMessage || t('expenseModal.errSave')
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!editing.value) return
  saving.value = true
  try {
    await store.deleteExpense(editing.value.id)
    closeExpense()
  } catch (e: any) {
    error.value = e?.data?.statusMessage || t('expenseModal.errDelete')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UiModal :open="open" :title="editing ? $t('expenseModal.editExpense') : $t('expenseModal.newExpense')" :width="540" @close="closeExpense">
    <form style="padding: 22px" @submit.prevent="submit">
      <div v-if="lockedOther" style="display: flex; align-items: center; gap: 8px; color: var(--muted); font-size: 13px; margin-bottom: 14px">
        <UiIcon name="lock" :size="16" /> {{ $t('expenseModal.lockedOther') }}
      </div>

      <!-- Amount -->
      <div style="text-align: center; margin-bottom: 20px">
        <div style="font-size: 12.5px; color: var(--muted); margin-bottom: 4px">{{ $t('expenseModal.amount') }}</div>
        <div style="display: inline-flex; align-items: baseline; gap: 6px">
          <input v-model="form.amount" class="tnum" inputmode="decimal" placeholder="0,00" :disabled="lockedOther"
            style="width: 180px; text-align: center; font-size: 40px; font-weight: 700; border: none; background: transparent; color: var(--ink); outline: none" />
          <span style="font-size: 28px; font-weight: 600; color: var(--muted)">€</span>
        </div>
      </div>

      <UiField :label="$t('expenseModal.category')" style="margin-bottom: 14px">
        <UiInput v-if="catOptions.length > 6" v-model="catQuery" :disabled="lockedOther"
          :placeholder="$t('expenseModal.searchCategory')" style="margin-bottom: 8px" />
        <div style="display: flex; flex-wrap: wrap; gap: 8px; max-height: 168px; overflow-y: auto">
          <button v-for="o in filteredCats" :key="o.key" type="button" :disabled="lockedOther"
            :style="chipStyle(form.cat === o.cat && form.sub === o.sub, o.hue)" @click="form.cat = o.cat; form.sub = o.sub">
            <span :style="{ width: '8px', height: '8px', borderRadius: '50%', background: catColor(o.hue, isDark) }" />{{ o.label }}
          </button>
          <span v-if="!filteredCats.length" style="font-size: 13px; color: var(--muted); padding: 6px 2px">{{ $t('expenseModal.noCategory') }}</span>
        </div>
      </UiField>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px">
        <UiField :label="$t('expenseModal.date')">
          <UiInput v-model="form.date" type="date" :disabled="lockedOther" />
        </UiField>
        <UiField :label="$t('expenseModal.method')">
          <UiSelect v-model="form.method">
            <option v-for="m in METHODS" :key="m" :value="m">{{ m }}</option>
          </UiSelect>
        </UiField>
      </div>

      <UiField v-if="canChangeWho" :label="$t('expenseModal.paidBy')" style="margin-bottom: 14px">
        <UiSelect v-model="form.who">
          <option v-for="m in store.activeMembers.value" :key="m.id" :value="m.id">{{ m.name }}</option>
        </UiSelect>
      </UiField>

      <UiField :label="$t('expenseModal.note')" style="margin-bottom: 18px">
        <UiInput v-model="form.note" :placeholder="$t('expenseModal.notePlaceholder')" :disabled="lockedOther" />
      </UiField>

      <div v-if="error" style="color: var(--neg); font-size: 13px; margin-bottom: 12px">{{ error }}</div>

      <div style="display: flex; gap: 10px; align-items: center">
        <UiButton v-if="editing && !lockedOther" variant="danger" type="button" icon="trash" @click="remove">{{ $t('expenseModal.delete') }}</UiButton>
        <div style="flex: 1" />
        <UiButton variant="ghost" type="button" @click="closeExpense">{{ $t('common.cancel') }}</UiButton>
        <UiButton v-if="!lockedOther" type="submit" :icon="saving ? undefined : 'check'">{{ saving ? $t('common.saving') : $t('common.save') }}</UiButton>
      </div>
    </form>
  </UiModal>
</template>
