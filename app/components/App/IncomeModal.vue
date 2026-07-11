<script setup lang="ts">
const { t } = useI18n()
const { incomeModal, closeIncome } = useAppUi()
const store = useStore()
const { user } = useUserSession()

const editing = computed(() => incomeModal.value.editing)
const open = computed(() => incomeModal.value.open)
const isAdmin = computed(() => user.value?.role === 'admin')

const today = new Date().toISOString().slice(0, 10)
const form = reactive({
  amount: '', source: '', date: today, who: user.value?.id ?? '', note: '',
})
const error = ref('')
const saving = ref(false)

watch(open, (o) => {
  if (!o) return
  error.value = ''
  const e = editing.value
  if (e) {
    form.amount = (e.amountCents / 100).toFixed(2)
    form.source = e.source; form.date = e.date
    form.who = e.userId; form.note = e.note
  } else {
    form.amount = ''; form.source = ''; form.date = today
    form.who = user.value?.id ?? ''; form.note = ''
  }
})

// A normal user can only edit/create their own incomes.
const canChangeWho = computed(() => isAdmin.value)
const lockedOther = computed(() => !!editing.value && !isAdmin.value && editing.value.userId !== user.value?.id)

// Quick-pick suggestions for the source field.
const sourceSuggestions = computed(() => [
  t('incomeModal.srcSalary'), t('incomeModal.srcSubsidy'), t('incomeModal.srcExtra'), t('incomeModal.srcOther'),
])

async function submit() {
  error.value = ''
  const amount = parseFloat(form.amount.replace(',', '.'))
  if (!amount || amount <= 0) { error.value = t('incomeModal.errAmount'); return }
  saving.value = true
  try {
    const body = {
      date: form.date, amount, source: form.source, note: form.note,
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

      <UiField :label="$t('incomeModal.source')" style="margin-bottom: 14px">
        <UiInput v-model="form.source" :placeholder="$t('incomeModal.sourcePlaceholder')" :disabled="lockedOther" />
        <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px">
          <button v-for="s in sourceSuggestions" :key="s" type="button" :disabled="lockedOther"
            style="padding: 5px 11px; border-radius: 99px; font-size: 12.5px; font-weight: 530; cursor: pointer; border: 1px solid var(--border-2); background: transparent; color: var(--ink-2)"
            @click="form.source = s">{{ s }}</button>
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
