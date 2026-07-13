<script setup lang="ts">
import { catColor, catSoft } from '~~/shared/config'

const { t } = useI18n()
const { incomeModal, closeIncome } = useAppUi()
const store = useStore()
const incomeCats = useIncomeCategories()
const activeCats = incomeCats.active // top-level binding so the template unwraps the ref
const { user } = useUserSession()
const { isDark } = useTweaks()

const editing = computed(() => incomeModal.value.editing)
const open = computed(() => incomeModal.value.open)
const isAdmin = computed(() => user.value?.role === 'admin')

const today = new Date().toISOString().slice(0, 10)
const defaultCat = () => incomeCats.active.value[0]?.id ?? ''
const form = reactive({
  amount: '', cat: '', date: today, who: user.value?.id ?? '', note: '',
})
const error = ref('')
const saving = ref(false)

watch(open, (o) => {
  if (!o) return
  error.value = ''
  const e = editing.value
  if (e) {
    form.amount = (e.amountCents / 100).toFixed(2)
    form.cat = e.cat; form.date = e.date
    form.who = e.userId; form.note = e.note
  } else {
    form.amount = ''; form.cat = defaultCat(); form.date = today
    form.who = user.value?.id ?? ''; form.note = ''
  }
})

// A normal user can only edit/create their own incomes.
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
  if (!amount || amount <= 0) { error.value = t('incomeModal.errAmount'); return }
  if (!form.cat) { error.value = t('incomeModal.errCat'); return }
  saving.value = true
  try {
    const body = {
      date: form.date, amount, cat: form.cat, note: form.note,
      who: canChangeWho.value ? form.who : undefined,
    }
    if (editing.value) await store.updateIncome(editing.value.id, body)
    else await store.addIncome(body)
    closeIncome()
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.statusMessage || t('incomeModal.errSave')
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!editing.value) return
  saving.value = true
  try {
    await store.deleteIncome(editing.value.id)
    closeIncome()
  } catch (e: any) {
    error.value = e?.data?.statusMessage || t('incomeModal.errDelete')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UiModal :open="open" :title="editing ? $t('incomeModal.editIncome') : $t('incomeModal.newIncome')" :width="480" @close="closeIncome">
    <form style="padding: 22px" @submit.prevent="submit">
      <div v-if="lockedOther" style="display: flex; align-items: center; gap: 8px; color: var(--muted); font-size: 13px; margin-bottom: 14px">
        <UiIcon name="lock" :size="16" /> {{ $t('incomeModal.lockedOther') }}
      </div>

      <!-- Amount -->
      <div style="text-align: center; margin-bottom: 20px">
        <div style="font-size: 12.5px; color: var(--muted); margin-bottom: 4px">{{ $t('incomeModal.amount') }}</div>
        <div style="display: inline-flex; align-items: baseline; gap: 6px">
          <input v-model="form.amount" class="tnum" inputmode="decimal" placeholder="0,00" :disabled="lockedOther"
            style="width: 180px; text-align: center; font-size: 40px; font-weight: 700; border: none; background: transparent; color: var(--pos); outline: none" />
          <span style="font-size: 28px; font-weight: 600; color: var(--muted)">€</span>
        </div>
      </div>

      <UiField :label="$t('incomeModal.category')" style="margin-bottom: 14px">
        <div style="display: flex; flex-wrap: wrap; gap: 8px">
          <button v-for="c in activeCats" :key="c.id" type="button" :disabled="lockedOther"
            :style="chipStyle(form.cat === c.id, c.hue)" @click="form.cat = c.id">
            <span :style="{ width: '8px', height: '8px', borderRadius: '50%', background: catColor(c.hue, isDark) }" />{{ incomeCats.catLabel(c.id) }}
          </button>
          <span v-if="!activeCats.length" style="font-size: 13px; color: var(--muted); padding: 6px 2px">{{ $t('incomeModal.noCategory') }}</span>
        </div>
      </UiField>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px">
        <UiField :label="$t('incomeModal.date')">
          <UiInput v-model="form.date" type="date" :disabled="lockedOther" />
        </UiField>
        <UiField v-if="canChangeWho" :label="$t('incomeModal.receivedBy')">
          <UiSelect v-model="form.who">
            <option v-for="m in store.activeMembers.value" :key="m.id" :value="m.id">{{ m.name }}</option>
          </UiSelect>
        </UiField>
      </div>

      <UiField :label="$t('incomeModal.note')" style="margin-bottom: 18px">
        <UiInput v-model="form.note" :placeholder="$t('incomeModal.notePlaceholder')" :disabled="lockedOther" />
      </UiField>

      <div v-if="error" style="color: var(--neg); font-size: 13px; margin-bottom: 12px">{{ error }}</div>

      <div style="display: flex; gap: 10px; align-items: center">
        <UiButton v-if="editing && !lockedOther" variant="danger" type="button" icon="trash" @click="remove">{{ $t('incomeModal.delete') }}</UiButton>
        <div style="flex: 1" />
        <UiButton variant="ghost" type="button" @click="closeIncome">{{ $t('common.cancel') }}</UiButton>
        <UiButton v-if="!lockedOther" type="submit" :icon="saving ? undefined : 'check'">{{ saving ? $t('common.saving') : $t('common.save') }}</UiButton>
      </div>
    </form>
  </UiModal>
</template>
