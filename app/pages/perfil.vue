<script setup lang="ts">
definePageMeta({ title: 'Perfil', subtitle: 'A sua conta e preferências' })
const { user, fetch: refreshSession, clear } = useUserSession()
const { theme, setTheme } = useTweaks()

const name = ref(user.value?.name ?? '')
const pw = ref('')
const pw2 = ref('')
const msg = ref('')
const err = ref('')
const saving = ref(false)

async function saveProfile() {
  msg.value = ''; err.value = ''
  const body: any = {}
  if (name.value && name.value !== user.value?.name) body.name = name.value
  if (pw.value) {
    if (pw.value.length < 8) { err.value = 'Password mínima de 8 caracteres'; return }
    if (pw.value !== pw2.value) { err.value = 'As passwords não coincidem'; return }
    body.password = pw.value
  }
  if (!Object.keys(body).length) { msg.value = 'Nada para guardar'; return }
  saving.value = true
  try {
    await $fetch('/api/me', { method: 'PATCH', body })
    await refreshSession()
    pw.value = ''; pw2.value = ''
    msg.value = 'Perfil atualizado.'
  } catch (e: any) { err.value = e?.data?.statusMessage || 'Erro ao guardar' }
  finally { saving.value = false }
}

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await clear()
  await navigateTo('/login')
}
</script>

<template>
  <div style="max-width: 680px; margin: 0 auto; display: flex; flex-direction: column; gap: 16px">
    <UiCard :pad="24">
      <div style="display: flex; align-items: center; gap: 16px">
        <UiAvatar :member="user ? { name: user.name, hue: user.hue } : null" :size="60" />
        <div>
          <div style="display: flex; align-items: center; gap: 8px">
            <span style="font-size: 19px; font-weight: 700">{{ user?.name }}</span>
            <UiTag v-if="user?.role === 'admin'" tone="admin">Admin</UiTag>
          </div>
          <div style="font-size: 13.5px; color: var(--muted)">{{ user?.email }}</div>
        </div>
      </div>
    </UiCard>

    <UiCard :pad="22">
      <UiSectionTitle>Dados da conta</UiSectionTitle>
      <form @submit.prevent="saveProfile">
        <UiField label="Nome" style="margin-bottom: 14px"><UiInput v-model="name" autocomplete="name" /></UiField>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px">
          <UiField label="Nova password" hint="Deixe vazio para manter."><UiInput v-model="pw" type="password" placeholder="••••••••" autocomplete="new-password" /></UiField>
          <UiField label="Confirmar"><UiInput v-model="pw2" type="password" placeholder="••••••••" autocomplete="new-password" /></UiField>
        </div>
        <div v-if="err" style="color: var(--neg); font-size: 13px; margin-bottom: 12px">{{ err }}</div>
        <div v-if="msg" style="color: var(--pos); font-size: 13px; margin-bottom: 12px">{{ msg }}</div>
        <UiButton type="submit" :icon="saving ? undefined : 'check'">{{ saving ? 'A guardar…' : 'Guardar alterações' }}</UiButton>
      </form>
    </UiCard>

    <UiCard :pad="22">
      <UiSectionTitle>Aparência</UiSectionTitle>
      <UiField label="Tema" hint="A escolha fica guardada neste dispositivo.">
        <UiSegmented :model-value="theme" :options="[{ value: 'light', label: 'Claro' }, { value: 'dark', label: 'Escuro' }]"
          @update:model-value="setTheme($event as any)" />
      </UiField>
    </UiCard>

    <UiCard :pad="22">
      <div style="display: flex; align-items: center; justify-content: space-between">
        <div>
          <div style="font-weight: 600">Terminar sessão</div>
          <div style="font-size: 13px; color: var(--muted)">Sair da sua conta neste dispositivo.</div>
        </div>
        <UiButton variant="outline" icon="logout" @click="logout">Sair</UiButton>
      </div>
    </UiCard>
  </div>
</template>
