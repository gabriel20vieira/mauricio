<script setup lang="ts">
import { deviceLabel, relativeTime } from '~~/shared/config'
import type { SessionInfo } from '~/composables/useStore'

definePageMeta({ titleKey: 'profile.title', subtitleKey: 'pageSub.profile' })
const { user, fetch: refreshSession, clear } = useUserSession()
const { theme, setTheme } = useTweaks()
const store = useStore()
const { t, locale, locales, setLocale } = useI18n()

const name = ref(user.value?.name ?? '')
const pw = ref('')
const pw2 = ref('')
const msg = ref('')
const err = ref('')
const saving = ref(false)

// Language preference ('auto' = detect from browser; otherwise a locale code).
const langPref = ref<string>('auto')
const langOptions = computed(() => [
  { value: 'auto', label: t('profile.useAutomatic') },
  ...locales.value.map((l: any) => ({ value: l.code, label: l.name })),
])
async function changeLang(val: string) {
  langPref.value = val
  if (val !== 'auto') await setLocale(val as any)
  await $fetch('/api/me', { method: 'PATCH', body: { locale: val === 'auto' ? null : val } }).catch(() => {})
}

const sessions = ref<SessionInfo[]>([])
async function loadSessions() { sessions.value = await store.fetchSessions().catch(() => []) }
onMounted(async () => {
  await loadSessions()
  const st = await $fetch<{ userLocale: string | null }>('/api/i18n/state').catch(() => ({ userLocale: null }))
  langPref.value = st.userLocale || 'auto'
})

async function revoke(s: SessionInfo) {
  await store.revokeSession(s.id)
  if (s.current) { await clear(); return navigateTo('/login') }
  await loadSessions()
}

async function saveProfile() {
  msg.value = ''; err.value = ''
  const body: any = {}
  if (name.value && name.value !== user.value?.name) body.name = name.value
  if (pw.value) {
    if (pw.value.length < 8) { err.value = t('profile.errPwLength'); return }
    if (pw.value !== pw2.value) { err.value = t('profile.errPwMatch'); return }
    body.password = pw.value
  }
  if (!Object.keys(body).length) { msg.value = t('profile.nothingToSave'); return }
  saving.value = true
  try {
    await $fetch('/api/me', { method: 'PATCH', body })
    await refreshSession()
    pw.value = ''; pw2.value = ''
    msg.value = t('profile.msgSaved')
  } catch (e: any) { err.value = e?.data?.statusMessage || t('profile.errSave') }
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
      <UiSectionTitle>{{ $t('profile.accountData') }}</UiSectionTitle>
      <form @submit.prevent="saveProfile">
        <UiField :label="$t('profile.name')" style="margin-bottom: 14px"><UiInput v-model="name" autocomplete="name" /></UiField>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px">
          <UiField :label="$t('profile.newPassword')" :hint="$t('profile.newPasswordHint')"><UiInput v-model="pw" type="password" placeholder="••••••••" autocomplete="new-password" /></UiField>
          <UiField :label="$t('profile.confirm')"><UiInput v-model="pw2" type="password" placeholder="••••••••" autocomplete="new-password" /></UiField>
        </div>
        <div v-if="err" style="color: var(--neg); font-size: 13px; margin-bottom: 12px">{{ err }}</div>
        <div v-if="msg" style="color: var(--pos); font-size: 13px; margin-bottom: 12px">{{ msg }}</div>
        <UiButton type="submit" :icon="saving ? undefined : 'check'">{{ saving ? $t('common.saving') : $t('profile.saveChanges') }}</UiButton>
      </form>
    </UiCard>

    <UiCard :pad="22">
      <UiSectionTitle>{{ $t('profile.appearance') }}</UiSectionTitle>
      <UiField :label="$t('profile.theme')" :hint="$t('profile.themeHint')" style="margin-bottom: 16px">
        <UiSegmented :model-value="theme" :options="[{ value: 'light', label: $t('profile.light') }, { value: 'dark', label: $t('profile.dark') }]"
          @update:model-value="setTheme($event as any)" />
      </UiField>
      <UiField :label="$t('profile.language')" :hint="$t('profile.languageHint')">
        <UiSelect :model-value="langPref" @update:model-value="changeLang($event)">
          <option v-for="o in langOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
        </UiSelect>
      </UiField>
    </UiCard>

    <UiCard :pad="22">
      <UiSectionTitle>{{ $t('profile.sessions') }}</UiSectionTitle>
      <p style="font-size: 13px; color: var(--muted); margin-bottom: 14px">{{ $t('profile.sessionsSub') }}</p>
      <div style="display: flex; flex-direction: column">
        <div v-for="s in sessions" :key="s.id"
          style="display: flex; align-items: center; gap: 12px; padding: 12px 2px; border-top: 1px solid var(--border)">
          <div style="width: 34px; height: 34px; border-radius: 9px; background: var(--surface-2); display: grid; place-items: center; color: var(--ink-2); flex-shrink: 0">
            <UiIcon name="user" :size="18" />
          </div>
          <div style="flex: 1; min-width: 0">
            <div style="display: flex; align-items: center; gap: 8px">
              <span style="font-weight: 600; font-size: 14px">{{ deviceLabel(s.userAgent) }}</span>
              <UiTag v-if="s.current" tone="accent">{{ $t('profile.thisDevice') }}</UiTag>
            </div>
            <div style="font-size: 12.5px; color: var(--muted)">{{ $t('profile.lastSeen', { time: relativeTime(s.lastSeenAt, locale) }) }}<span v-if="s.ip"> · {{ s.ip }}</span></div>
          </div>
          <UiButton variant="outline" size="sm" icon="logout" @click="revoke(s)">{{ s.current ? $t('profile.leave') : $t('profile.terminate') }}</UiButton>
        </div>
        <div v-if="!sessions.length" style="font-size: 13px; color: var(--muted); padding: 8px 2px">{{ $t('profile.noSessions') }}</div>
      </div>
    </UiCard>

    <UiCard :pad="22">
      <div style="display: flex; align-items: center; justify-content: space-between">
        <div>
          <div style="font-weight: 600">{{ $t('profile.endSession') }}</div>
          <div style="font-size: 13px; color: var(--muted)">{{ $t('profile.endSessionSub') }}</div>
        </div>
        <UiButton variant="outline" icon="logout" @click="logout">{{ $t('profile.signOut') }}</UiButton>
      </div>
    </UiCard>
  </div>
</template>
