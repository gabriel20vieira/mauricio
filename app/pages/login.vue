<script setup lang="ts">
import { CATEGORIES } from '~~/shared/config'

definePageMeta({ layout: 'auth' })
const appName = useRuntimeConfig().public.appName
useHead({ title: `Entrar · ${appName}` })

const { fetch: refreshSession } = useUserSession()
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await $fetch('/api/auth/login', { method: 'POST', body: { email: email.value, password: password.value } })
    await refreshSession()
    await navigateTo('/')
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Email ou password incorretos'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-wrap">
    <!-- Brand panel -->
    <div class="login-brand" style="position: relative; overflow: hidden; background: var(--accent-soft); padding: 56px 56px; display: flex; flex-direction: column">
      <div style="position: absolute; width: 420px; height: 420px; border: 1px solid oklch(0.5 0.05 var(--accent-h) / 0.25); border-radius: 50%; top: -120px; right: -80px" />
      <div style="position: absolute; width: 360px; height: 360px; border: 1px solid oklch(0.5 0.05 var(--accent-h) / 0.2); border-radius: 50%; bottom: -140px; left: 80px" />

      <div style="display: flex; align-items: center; gap: 12px; position: relative">
        <div style="width: 40px; height: 40px; border-radius: 11px; background: var(--accent); color: var(--accent-ink); display: grid; place-items: center">
          <UiIcon name="home" :size="22" />
        </div>
        <span style="font-size: 20px; font-weight: 700; letter-spacing: -0.02em">{{ appName }}</span>
      </div>

      <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; position: relative">
        <h1 style="font-size: 40px; line-height: 1.1; font-weight: 700; letter-spacing: -0.03em; color: var(--ink)">As contas da casa,<br>todas no mesmo sítio.</h1>
        <p style="margin-top: 22px; max-width: 360px; font-size: 15px; color: var(--ink-2); line-height: 1.55">
          Registem cada gasto, vejam para onde vai o dinheiro do lar e quem contribuiu com quanto — em conjunto.
        </p>
      </div>

      <div style="display: flex; gap: 36px; position: relative">
        <div>
          <div style="font-size: 22px; font-weight: 700" class="tnum">{{ CATEGORIES.length }}</div>
          <div style="font-size: 13px; color: var(--ink-2)">Categorias</div>
        </div>
        <div>
          <div style="font-size: 22px; font-weight: 700">€</div>
          <div style="font-size: 13px; color: var(--ink-2)">Euros · PT</div>
        </div>
        <div>
          <div style="font-size: 22px; font-weight: 700; display: flex; align-items: center"><UiIcon name="users" :size="22" /></div>
          <div style="font-size: 13px; color: var(--ink-2)">Toda a família</div>
        </div>
      </div>
    </div>

    <!-- Form panel -->
    <div style="display: flex; align-items: center; justify-content: center; padding: 40px 24px; background: var(--bg)">
      <div style="width: 100%; max-width: 360px">
        <h2 style="font-size: 24px; font-weight: 700; letter-spacing: -0.02em">Bem-vindo de volta</h2>
        <p style="color: var(--muted); margin: 6px 0 28px; font-size: 14px">Entre com a sua conta da casa.</p>

        <form @submit.prevent="submit">
          <UiField label="Email" style="margin-bottom: 14px">
            <UiInput v-model="email" type="email" placeholder="nome@casa.pt" autocomplete="username" required />
          </UiField>
          <UiField label="Password" style="margin-bottom: 18px">
            <UiInput v-model="password" type="password" placeholder="••••••••" autocomplete="current-password" required />
          </UiField>

          <div v-if="error" style="color: var(--neg); font-size: 13px; margin-bottom: 14px">{{ error }}</div>

          <UiButton type="submit" size="lg" full :icon="loading ? undefined : 'logout'">{{ loading ? 'A entrar…' : 'Entrar' }}</UiButton>
        </form>

        <p style="margin-top: 20px; font-size: 12.5px; color: var(--muted); text-align: center">
          As contas novas são criadas por um administrador.
        </p>
      </div>
    </div>
  </div>
</template>
