<script setup lang="ts">
import { CATEGORIES, CAT_BY_ID, METHODS, catColor, catSoft } from '~~/shared/config'

const { expenseModal, closeExpense } = useAppUi()
const store = useStore()
const { user } = useUserSession()
const { isDark } = useTweaks()

const editing = computed(() => expenseModal.value.editing)
const open = computed(() => expenseModal.value.open)
const isAdmin = computed(() => user.value?.role === 'admin')

const today = new Date().toISOString().slice(0, 10)
const form = reactive({
  amount: '', cat: 'alimentacao', sub: '', date: today, who: user.value?.id ?? '', method: 'Cartão', note: '',
})
const error = ref('')
const saving = ref(false)

watch(open, (o) => {
  if (!o) return
  error.value = ''
  const e = editing.value
  if (e) {
    form.amount = (e.amountCents / 100).toFixed(2)
    form.cat = e.cat; form.sub = e.sub; form.date = e.date
    form.who = e.userId; form.method = e.method || 'Cartão'; form.note = e.note
  } else {
    form.amount = ''; form.cat = 'alimentacao'; form.sub = ''; form.date = today
    form.who = user.value?.id ?? ''; form.method = 'Cartão'; form.note = ''
  }
})

const cat = computed(() => CAT_BY_ID[form.cat])
watch(() => form.cat, () => {
  if (!cat.value.subs.includes(form.sub)) form.sub = ''
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
  if (!amount || amount <= 0) { error.value = 'Indique um valor válido'; return }
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
    error.value = e?.data?.statusMessage || e?.statusMessage || 'Erro ao guardar'
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
    error.value = e?.data?.statusMessage || 'Erro ao apagar'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UiModal :open="open" :title="editing ? 'Editar gasto' : 'Novo gasto'" :width="540" @close="closeExpense">
    <form style="padding: 22px" @submit.prevent="submit">
      <div v-if="lockedOther" style="display: flex; align-items: center; gap: 8px; color: var(--muted); font-size: 13px; margin-bottom: 14px">
        <UiIcon name="lock" :size="16" /> Só pode editar os seus próprios gastos.
      </div>

      <!-- Amount -->
      <div style="text-align: center; margin-bottom: 20px">
        <div style="font-size: 12.5px; color: var(--muted); margin-bottom: 4px">Valor</div>
        <div style="display: inline-flex; align-items: baseline; gap: 6px">
          <input v-model="form.amount" class="tnum" inputmode="decimal" placeholder="0,00" :disabled="lockedOther"
            style="width: 180px; text-align: center; font-size: 40px; font-weight: 700; border: none; background: transparent; color: var(--ink); outline: none" />
          <span style="font-size: 28px; font-weight: 600; color: var(--muted)">€</span>
        </div>
      </div>

      <UiField label="Categoria" style="margin-bottom: 14px">
        <div style="display: flex; flex-wrap: wrap; gap: 8px">
          <button v-for="c in CATEGORIES" :key="c.id" type="button" :disabled="lockedOther"
            :style="chipStyle(form.cat === c.id, c.hue)" @click="form.cat = c.id">
            <span :style="{ width: '8px', height: '8px', borderRadius: '50%', background: catColor(c.hue, isDark) }" />{{ c.label }}
          </button>
        </div>
      </UiField>

      <div v-if="cat.subs.length" style="margin-bottom: 14px">
        <UiField label="Subcategoria">
          <div style="display: flex; flex-wrap: wrap; gap: 8px">
            <button type="button" :disabled="lockedOther" :style="chipStyle(form.sub === '', cat.hue)" @click="form.sub = ''">—</button>
            <button v-for="s in cat.subs" :key="s" type="button" :disabled="lockedOther" :style="chipStyle(form.sub === s, cat.hue)" @click="form.sub = s">{{ s }}</button>
          </div>
        </UiField>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px">
        <UiField label="Data">
          <UiInput v-model="form.date" type="date" :disabled="lockedOther" />
        </UiField>
        <UiField label="Método">
          <UiSelect v-model="form.method">
            <option v-for="m in METHODS" :key="m" :value="m">{{ m }}</option>
          </UiSelect>
        </UiField>
      </div>

      <UiField v-if="canChangeWho" label="Pago por" style="margin-bottom: 14px">
        <UiSelect v-model="form.who">
          <option v-for="m in store.members.value" :key="m.id" :value="m.id">{{ m.name }}</option>
        </UiSelect>
      </UiField>

      <UiField label="Nota" style="margin-bottom: 18px">
        <UiInput v-model="form.note" placeholder="ex.: Continente — compra semanal" :disabled="lockedOther" />
      </UiField>

      <div v-if="error" style="color: var(--neg); font-size: 13px; margin-bottom: 12px">{{ error }}</div>

      <div style="display: flex; gap: 10px; align-items: center">
        <UiButton v-if="editing && !lockedOther" variant="danger" type="button" icon="trash" @click="remove">Apagar</UiButton>
        <div style="flex: 1" />
        <UiButton variant="ghost" type="button" @click="closeExpense">Cancelar</UiButton>
        <UiButton v-if="!lockedOther" type="submit" :icon="saving ? undefined : 'check'">{{ saving ? 'A guardar…' : 'Guardar' }}</UiButton>
      </div>
    </form>
  </UiModal>
</template>
