<script setup lang="ts">
definePageMeta({ layout: 'auth' })
const appName = useRuntimeConfig().public.appName
useHead({ title: `Configuração inicial · ${appName}` })

const { fetch: refreshSession } = useUserSession()
const name = ref('')
const email = ref('')
const password = ref('')
const confirm = ref('')
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  if (password.value.length < 8) { error.value = 'A password deve ter pelo menos 8 caracteres'; return }
  if (password.value !== confirm.value) { error.value = 'As passwords não coincidem'; return }
  loading.value = true
  try {
    await $fetch('/api/auth/setup', { method: 'POST', body: { name: name.value, email: email.value, password: password.value } })
    await refreshSession()
    await navigateTo('/')
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Não foi possível criar a conta'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-wrap">
    <!-- Brand panel -->
    <div class="login-brand"
      style="position: relative; overflow: hidden; background: var(--accent-soft); padding: 56px; display: flex; flex-direction: column">
      <div
        style="position: absolute; width: 420px; height: 420px; border: 1px solid oklch(0.5 0.05 var(--accent-h) / 0.25); border-radius: 50%; top: -120px; right: -80px" />
      <div
        style="position: absolute; width: 360px; height: 360px; border: 1px solid oklch(0.5 0.05 var(--accent-h) / 0.2); border-radius: 50%; bottom: -140px; left: 80px" />

      <div style="display: flex; align-items: center; gap: 12px; position: relative">
        <div
          style="width: 40px; height: 40px; border-radius: 11px; background: var(--accent); color: var(--accent-ink); display: grid; place-items: center">
          <UiIcon name="home" :size="22" />
        </div>
        <span style="font-size: 20px; font-weight: 700; letter-spacing: -0.02em">{{ appName }}</span>
      </div>

      <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; position: relative">
        <UiTag tone="accent">Primeira configuração</UiTag>
        <h1
          style="margin-top: 14px; font-size: 38px; line-height: 1.1; font-weight: 700; letter-spacing: -0.03em; color: var(--ink)">
          Vamos criar o<br>administrador da casa.</h1>
        <p style="margin-top: 22px; max-width: 360px; font-size: 15px; color: var(--ink-2); line-height: 1.55">
          Esta é a conta principal. Depois poderá adicionar os restantes membros da família a partir da área de
          Administração.
        </p>
      </div>
    </div>

    <!-- Form panel -->
    <div style="display: flex; align-items: center; justify-content: center; padding: 40px 24px; background: var(--bg)">
      <div style="width: 100%; max-width: 380px">
        <h2 style="font-size: 24px; font-weight: 700; letter-spacing: -0.02em">Conta de administrador</h2>
        <p style="color: var(--muted); margin: 6px 0 28px; font-size: 14px">Crie a primeira conta para começar.</p>

        <form @submit.prevent="submit">
          <UiField label="Nome" style="margin-bottom: 14px">
            <UiInput v-model="name" placeholder="ex.: Maria Silva" required />
          </UiField>
          <UiField label="Email" style="margin-bottom: 14px">
            <UiInput v-model="email" type="email" placeholder="nome@casa.pt" required />
          </UiField>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 18px">
            <UiField label="Password">
              <UiInput v-model="password" type="password" placeholder="••••••••" required />
            </UiField>
            <UiField label="Confirmar">
              <UiInput v-model="confirm" type="password" placeholder="••••••••" required />
            </UiField>
          </div>

          <div v-if="error" style="color: var(--neg); font-size: 13px; margin-bottom: 14px">{{ error }}</div>

          <UiButton type="submit" size="lg" full :icon="loading ? undefined : 'check'">{{ loading ? 'A criar…' : 'Criar administrador' }}</UiButton>
        </form>
      </div>
    </div>
  </div>
</template>
