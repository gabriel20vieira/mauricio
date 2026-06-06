<script setup lang="ts">
import { CATEGORIES, catColor, catSoft } from '~~/shared/config'

usePageHeader('Administração', 'Gestão de membros e categorias')
const store = useStore()
const { user } = useUserSession()
const { isDark } = useTweaks()
onMounted(() => store.ensure())

// --- add member ---
const addOpen = ref(false)
const form = reactive({ name: '', email: '', password: '', role: 'user' as 'admin' | 'user' })
const addError = ref('')
const adding = ref(false)

function resetForm() { form.name = ''; form.email = ''; form.password = ''; form.role = 'user'; addError.value = '' }
async function addMember() {
  addError.value = ''
  if (form.password.length < 8) { addError.value = 'Password mínima de 8 caracteres'; return }
  adding.value = true
  try {
    await store.addMember({ ...form })
    addOpen.value = false; resetForm()
  } catch (e: any) {
    addError.value = e?.data?.statusMessage || 'Erro ao criar membro'
  } finally { adding.value = false }
}

// --- edit member ---
const edit = reactive<{ open: boolean; id: string; name: string; role: 'admin' | 'user'; password: string }>({ open: false, id: '', name: '', role: 'user', password: '' })
const editError = ref('')
function openEdit(m: typeof store.members.value[number]) {
  edit.open = true; edit.id = m.id; edit.name = m.name; edit.role = m.role; edit.password = ''; editError.value = ''
}
async function saveEdit() {
  editError.value = ''
  try {
    const body: any = { name: edit.name, role: edit.role }
    if (edit.password) { if (edit.password.length < 8) { editError.value = 'Password mínima de 8 caracteres'; return } body.password = edit.password }
    await store.updateMember(edit.id, body)
    edit.open = false
  } catch (e: any) { editError.value = e?.data?.statusMessage || 'Erro ao guardar' }
}
async function removeMember(id: string) {
  editError.value = ''
  try { await store.deleteMember(id); edit.open = false }
  catch (e: any) { editError.value = e?.data?.statusMessage || 'Erro ao remover' }
}
</script>

<template>
  <div style="max-width: 920px; margin: 0 auto; display: flex; flex-direction: column; gap: 16px">
    <UiCard :pad="22">
      <UiSectionTitle>
        Membros da casa
        <template #action><UiButton icon="plus" size="sm" @click="addOpen = true">Adicionar</UiButton></template>
      </UiSectionTitle>

      <div style="display: flex; flex-direction: column">
        <div v-for="m in store.members.value" :key="m.id"
          style="display: flex; align-items: center; gap: 13px; padding: 12px 4px; border-top: 1px solid var(--border)">
          <UiAvatar :member="m" :size="38" />
          <div style="flex: 1; min-width: 0">
            <div style="display: flex; align-items: center; gap: 8px">
              <span style="font-weight: 600; font-size: 14.5px">{{ m.name }}</span>
              <UiTag v-if="m.role === 'admin'" tone="admin">Admin</UiTag>
              <UiTag v-else>Membro</UiTag>
              <UiTag v-if="m.id === user?.id" tone="muted">Você</UiTag>
            </div>
            <div style="font-size: 12.5px; color: var(--muted)">{{ m.email }}</div>
          </div>
          <UiButton variant="outline" size="sm" icon="pencil" @click="openEdit(m)">Editar</UiButton>
        </div>
      </div>
    </UiCard>

    <UiCard :pad="22">
      <UiSectionTitle>Categorias</UiSectionTitle>
      <p style="font-size: 13px; color: var(--muted); margin-bottom: 16px">As categorias da casa e respetivas subcategorias.</p>
      <div style="display: flex; flex-wrap: wrap; gap: 10px">
        <div v-for="c in CATEGORIES" :key="c.id"
          :style="{ display: 'flex', alignItems: 'center', gap: '9px', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: catSoft(c.hue, isDark) }">
          <span :style="{ width: '10px', height: '10px', borderRadius: '50%', background: catColor(c.hue, isDark) }" />
          <span style="font-weight: 600; font-size: 13.5px; color: var(--ink)">{{ c.label }}</span>
          <span v-if="c.subs.length" style="font-size: 12px; color: var(--ink-2)">· {{ c.subs.join(', ') }}</span>
        </div>
      </div>
    </UiCard>

    <!-- Add modal -->
    <UiModal :open="addOpen" title="Adicionar membro" :width="460" @close="addOpen = false">
      <form style="padding: 22px" @submit.prevent="addMember">
        <UiField label="Nome" style="margin-bottom: 14px"><UiInput v-model="form.name" placeholder="ex.: João Silva" required /></UiField>
        <UiField label="Email" style="margin-bottom: 14px"><UiInput v-model="form.email" type="email" placeholder="nome@casa.pt" required /></UiField>
        <UiField label="Password temporária" hint="O membro pode alterá-la depois no perfil." style="margin-bottom: 14px">
          <UiInput v-model="form.password" type="password" placeholder="mín. 8 caracteres" required />
        </UiField>
        <UiField label="Função" style="margin-bottom: 18px">
          <UiSegmented v-model="form.role" :options="[{ value: 'user', label: 'Membro' }, { value: 'admin', label: 'Administrador' }]" />
        </UiField>
        <div v-if="addError" style="color: var(--neg); font-size: 13px; margin-bottom: 12px">{{ addError }}</div>
        <div style="display: flex; gap: 10px; justify-content: flex-end">
          <UiButton variant="ghost" type="button" @click="addOpen = false">Cancelar</UiButton>
          <UiButton type="submit" :icon="adding ? undefined : 'check'">{{ adding ? 'A criar…' : 'Criar membro' }}</UiButton>
        </div>
      </form>
    </UiModal>

    <!-- Edit modal -->
    <UiModal :open="edit.open" title="Editar membro" :width="460" @close="edit.open = false">
      <form style="padding: 22px" @submit.prevent="saveEdit">
        <UiField label="Nome" style="margin-bottom: 14px"><UiInput v-model="edit.name" required /></UiField>
        <UiField label="Função" style="margin-bottom: 14px">
          <UiSegmented v-model="edit.role" :options="[{ value: 'user', label: 'Membro' }, { value: 'admin', label: 'Administrador' }]" />
        </UiField>
        <UiField label="Nova password" hint="Deixe vazio para manter a atual." style="margin-bottom: 18px">
          <UiInput v-model="edit.password" type="password" placeholder="mín. 8 caracteres" />
        </UiField>
        <div v-if="editError" style="color: var(--neg); font-size: 13px; margin-bottom: 12px">{{ editError }}</div>
        <div style="display: flex; gap: 10px; align-items: center">
          <UiButton v-if="edit.id !== user?.id" variant="danger" type="button" icon="trash" @click="removeMember(edit.id)">Remover</UiButton>
          <div style="flex: 1" />
          <UiButton variant="ghost" type="button" @click="edit.open = false">Cancelar</UiButton>
          <UiButton type="submit" icon="check">Guardar</UiButton>
        </div>
      </form>
    </UiModal>
  </div>
</template>
