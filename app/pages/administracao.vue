<script setup lang="ts">
import { catColor, deviceLabel, relativeTime, CATEGORY_PALETTE } from '~~/shared/config'
import type { SessionInfo } from '~/composables/useStore'

definePageMeta({ titleKey: 'nav.admin', subtitleKey: 'pageSub.admin' })
const store = useStore()
const { user } = useUserSession()
const { isDark } = useTweaks()
const { t, locale, locales, setLocale } = useI18n()
onMounted(() => { store.ensure(); loadSessions(); loadForced() })

// --- forced language (admin, global) ---
const forced = ref<string>('auto')
const langOptions = computed(() => [
  { value: 'auto', label: t('admin.automatic') },
  ...locales.value.map((l: any) => ({ value: l.code, label: l.name })),
])
async function loadForced() {
  const st = await $fetch<{ forced: string | null }>('/api/i18n/state').catch(() => ({ forced: null }))
  forced.value = st.forced || 'auto'
}
async function changeForced(val: string) {
  forced.value = val
  await $fetch('/api/i18n/forced', { method: 'PUT', body: { locale: val === 'auto' ? null : val } }).catch(() => {})
  if (val !== 'auto') await setLocale(val as any)
}

// --- categories / subcategories management ---
const cats = useCategories()
const catModal = reactive({ open: false, id: '', hue: 200, names: { en: '', pt: '', es: '' }, description: '', error: '' })
function openCatNew() { Object.assign(catModal, { open: true, id: '', hue: 200, names: { en: '', pt: '', es: '' }, description: '', error: '' }) }
function openCatEdit(c: any) { Object.assign(catModal, { open: true, id: c.id, hue: c.hue, names: { ...c.names }, description: c.description || '', error: '' }) }
const catNameEmpty = computed(() => !catModal.names.en && !catModal.names.pt && !catModal.names.es)
async function saveCat() {
  catModal.error = ''
  if (catNameEmpty.value) return
  try {
    if (catModal.id) await store.updateCategory(catModal.id, { names: catModal.names, hue: catModal.hue, description: catModal.description })
    else await store.addCategory({ names: catModal.names, hue: catModal.hue, description: catModal.description })
    catModal.open = false
  } catch (e: any) { catModal.error = e?.data?.statusMessage || 'Erro' }
}
async function toggleCat(c: any) {
  if (c.active) { if (!confirm(t('admin.hideWarning'))) return; await store.hideCategory(c.id) }
  else await store.updateCategory(c.id, { active: true })
}

const subModal = reactive({ open: false, id: '', categoryId: '', names: { en: '', pt: '', es: '' }, description: '', error: '' })
function openSubNew(categoryId: string) { Object.assign(subModal, { open: true, id: '', categoryId, names: { en: '', pt: '', es: '' }, description: '', error: '' }) }
function openSubEdit(s: any, categoryId: string) { Object.assign(subModal, { open: true, id: s.id, categoryId, names: { ...s.names }, description: s.description || '', error: '' }) }
async function saveSub() {
  subModal.error = ''
  if (!subModal.names.en && !subModal.names.pt && !subModal.names.es) { subModal.error = '!'; return }
  try {
    if (subModal.id) await store.updateSubcategory(subModal.id, { names: subModal.names, description: subModal.description })
    else await store.addSubcategory({ categoryId: subModal.categoryId, names: subModal.names, description: subModal.description })
    subModal.open = false
  } catch (e: any) { subModal.error = e?.data?.statusMessage || '!' }
}
const subNameEmpty = computed(() => !subModal.names.en && !subModal.names.pt && !subModal.names.es)
async function toggleSub(s: any) {
  if (s.active) { if (!confirm(t('admin.hideWarning'))) return; await store.hideSubcategory(s.id) }
  else await store.updateSubcategory(s.id, { active: true })
}

// Auto-translate the filled name into the other languages (needs assistant on).
const assistantEnabled = useAssistantEnabled()
const translating = ref(false)
async function translateNames(target: { names: { en: string, pt: string, es: string } }) {
  translating.value = true
  try {
    const r = await $fetch<{ en: string, pt: string, es: string }>('/api/categories/translate', { method: 'POST', body: { names: target.names } })
    target.names.en = r.en; target.names.pt = r.pt; target.names.es = r.es
  } catch { /* ignore */ } finally { translating.value = false }
}

// --- assistant config ---
const asstCfg = reactive({ enabled: true, useCloud: false, baseUrl: '', model: '', token: '' })
const savingCfg = ref(false)
async function loadAsstCfg() { const c = await $fetch<typeof asstCfg>('/api/assistant/config').catch(() => null); if (c) Object.assign(asstCfg, c) }
async function saveAsstCfg() {
  savingCfg.value = true
  try {
    await $fetch('/api/assistant/config', { method: 'PUT', body: { ...asstCfg } })
    assistantEnabled.value = asstCfg.enabled
    await loadAllConvs()
  } finally { savingCfg.value = false }
}

// --- members' conversations (admin) ---
const allConvs = ref<any[]>([])
async function loadAllConvs() { allConvs.value = await $fetch<any[]>('/api/chat/conversations', { query: { all: 1 } }).catch(() => []) }
const convView = reactive<{ open: boolean, title: string, userName: string, messages: any[] }>({ open: false, title: '', userName: '', messages: [] })
async function openConv(c: any) {
  const d = await $fetch<{ messages: any[] }>(`/api/chat/conversations/${c.id}`)
  Object.assign(convView, { open: true, title: c.title, userName: c.userName, messages: d.messages })
}
async function delConv(c: any) {
  if (!confirm(t('admin.hideWarning'))) return
  await $fetch(`/api/chat/conversations/${c.id}`, { method: 'DELETE' })
  await loadAllConvs()
}

onMounted(() => { loadAsstCfg(); loadAllConvs() })

// --- sessions (all members) ---
const sessions = ref<SessionInfo[]>([])
async function loadSessions() { sessions.value = await store.fetchSessions(true).catch(() => []) }
async function revokeSession(id: string) { await store.revokeSession(id); await loadSessions() }
async function toggleActive(m: typeof store.members.value[number]) {
  await store.setMemberActive(m.id, !m.active)
  await loadSessions()
}

// --- add member ---
const addOpen = ref(false)
const form = reactive({ name: '', email: '', password: '', role: 'user' as 'admin' | 'user' })
const addError = ref('')
const adding = ref(false)

function resetForm() { form.name = ''; form.email = ''; form.password = ''; form.role = 'user'; addError.value = '' }
async function addMember() {
  addError.value = ''
  if (form.password.length < 8) { addError.value = t('admin.errPwLength'); return }
  adding.value = true
  try {
    await store.addMember({ ...form })
    addOpen.value = false; resetForm()
  } catch (e: any) {
    addError.value = e?.data?.statusMessage || t('admin.errCreate')
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
    if (edit.password) { if (edit.password.length < 8) { editError.value = t('admin.errPwLength'); return } body.password = edit.password }
    await store.updateMember(edit.id, body)
    edit.open = false
  } catch (e: any) { editError.value = e?.data?.statusMessage || t('admin.errSave') }
}
async function removeMember(id: string) {
  editError.value = ''
  try { await store.deleteMember(id); edit.open = false }
  catch (e: any) { editError.value = e?.data?.statusMessage || t('admin.errRemove') }
}

// --- export / import (JSON backup) ---
const importInput = ref<HTMLInputElement | null>(null)
const imp = reactive<{
  open: boolean
  kind: 'total' | 'parcial'
  payload: any
  counts: { label: string, n: number }[]
  error: string
  result: string
  busy: boolean
}>({ open: false, kind: 'parcial', payload: null, counts: [], error: '', result: '', busy: false })

async function exportData(scope: 'total' | 'parcial') {
  const env = await $fetch<any>('/api/data/export', { query: { scope } })
  const blob = new Blob([JSON.stringify(env, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `mauricio-${scope === 'total' ? 'total' : 'movimentos'}-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}

function pickImport(kind: 'total' | 'parcial') {
  imp.kind = kind
  importInput.value?.click()
}

async function onImportFile(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = '' // allow re-picking the same file
  if (!file) return
  imp.error = ''; imp.result = ''; imp.payload = null; imp.counts = []
  try {
    const parsed = JSON.parse(await file.text())
    if (parsed?.app !== 'mauricio' || parsed?.version !== 1) { imp.error = t('admin.importInvalidFile'); imp.open = true; return }
    if (parsed.kind !== imp.kind) { imp.error = t('admin.importKindMismatch'); imp.open = true; return }
    imp.payload = parsed
    const d = parsed.data || {}
    const count = (k: string, label: string) => Array.isArray(d[k]) && d[k].length ? [{ label, n: d[k].length }] : []
    imp.counts = [
      ...count('users', t('admin.members')),
      ...count('categories', t('admin.categories')),
      ...count('expenses', t('nav.expenses')),
      ...count('incomes', t('balance.income')),
      ...count('chatConversations', t('admin.conversations')),
    ]
    imp.open = true
  } catch {
    imp.error = t('admin.importInvalidFile'); imp.open = true
  }
}

async function confirmImport() {
  if (!imp.payload) return
  imp.busy = true; imp.error = ''
  try {
    const r = await $fetch<any>('/api/data/import', { method: 'POST', body: imp.payload })
    if (imp.kind === 'total') {
      await navigateTo('/login') // all sessions were wiped, importer included
      return
    }
    imp.result = t('admin.importPartialDone', { e: r.added.expenses, i: r.added.incomes, s: r.skipped })
    imp.payload = null; imp.counts = []
    await store.refresh()
  } catch (e: any) {
    imp.error = e?.data?.statusMessage || e?.statusMessage || t('admin.importFailed')
  } finally { imp.busy = false }
}
</script>

<template>
  <div style="max-width: 920px; margin: 0 auto; display: flex; flex-direction: column; gap: 16px">
    <UiCard :pad="22">
      <UiSectionTitle>
        {{ $t('admin.members') }}
        <template #action><UiButton icon="plus" size="sm" @click="addOpen = true">{{ $t('admin.add') }}</UiButton></template>
      </UiSectionTitle>

      <div style="display: flex; flex-direction: column">
        <div v-for="m in store.members.value" :key="m.id"
          :style="{ display: 'flex', alignItems: 'center', gap: '13px', padding: '12px 4px', borderTop: '1px solid var(--border)', opacity: m.active ? 1 : 0.55 }">
          <UiAvatar :member="m" :size="38" />
          <div style="flex: 1; min-width: 0">
            <div style="display: flex; align-items: center; gap: 8px">
              <span style="font-weight: 600; font-size: 14.5px">{{ m.name }}</span>
              <UiTag v-if="m.role === 'admin'" tone="admin">{{ $t('layout.administrator') }}</UiTag>
              <UiTag v-else>{{ $t('layout.member') }}</UiTag>
              <UiTag v-if="m.id === user?.id" tone="muted">{{ $t('common.you') }}</UiTag>
              <UiTag v-if="!m.active" tone="muted">{{ $t('admin.inactive') }}</UiTag>
            </div>
            <div style="font-size: 12.5px; color: var(--muted)">{{ m.email }}</div>
          </div>
          <div style="display: flex; gap: 6px">
            <UiButton v-if="m.active" variant="outline" size="sm" icon="pencil" @click="openEdit(m)">{{ $t('common.edit') }}</UiButton>
            <UiButton v-if="m.id !== user?.id && m.active" variant="danger" size="sm" icon="lock" @click="toggleActive(m)">{{ $t('admin.block') }}</UiButton>
            <UiButton v-else-if="m.id !== user?.id" variant="outline" size="sm" icon="check" @click="toggleActive(m)">{{ $t('admin.unblock') }}</UiButton>
          </div>
        </div>
      </div>
    </UiCard>

    <UiCard :pad="22">
      <UiSectionTitle>{{ $t('admin.sessions') }}</UiSectionTitle>
      <p style="font-size: 13px; color: var(--muted); margin-bottom: 14px">{{ $t('admin.sessionsAllSub') }}</p>
      <div style="display: flex; flex-direction: column">
        <div v-for="s in sessions" :key="s.id"
          style="display: flex; align-items: center; gap: 12px; padding: 12px 2px; border-top: 1px solid var(--border)">
          <div style="width: 34px; height: 34px; border-radius: 9px; background: var(--surface-2); display: grid; place-items: center; color: var(--ink-2); flex-shrink: 0">
            <UiIcon name="user" :size="18" />
          </div>
          <div style="flex: 1; min-width: 0">
            <div style="display: flex; align-items: center; gap: 8px">
              <span style="font-weight: 600; font-size: 14px">{{ s.userName }}</span>
              <UiTag v-if="s.current" tone="accent">{{ $t('admin.thisDevice') }}</UiTag>
            </div>
            <div style="font-size: 12.5px; color: var(--muted)">{{ deviceLabel(s.userAgent) }} · {{ relativeTime(s.lastSeenAt, locale) }}<span v-if="s.ip"> · {{ s.ip }}</span></div>
          </div>
          <UiButton variant="outline" size="sm" icon="logout" @click="revokeSession(s.id)">{{ $t('admin.terminate') }}</UiButton>
        </div>
        <div v-if="!sessions.length" style="font-size: 13px; color: var(--muted); padding: 8px 2px">{{ $t('admin.noSessions') }}</div>
      </div>
    </UiCard>

    <UiCard :pad="22">
      <UiSectionTitle>
        {{ $t('admin.categories') }}
        <template #action><UiButton icon="plus" size="sm" @click="openCatNew">{{ $t('admin.addCategory') }}</UiButton></template>
      </UiSectionTitle>
      <p style="font-size: 13px; color: var(--muted); margin-bottom: 8px">{{ $t('admin.manageCategoriesSub') }}</p>

      <div style="display: flex; flex-direction: column">
        <div v-for="c in store.categories.value" :key="c.id"
          :style="{ padding: '12px 2px', borderTop: '1px solid var(--border)', opacity: c.active ? 1 : 0.55 }">
          <div style="display: flex; align-items: center; gap: 10px">
            <span :style="{ width: '12px', height: '12px', borderRadius: '50%', background: catColor(c.hue, isDark), flexShrink: 0 }" />
            <span style="font-weight: 600; font-size: 14px">{{ cats.catLabel(c.id) }}</span>
            <UiTag v-if="!c.active" tone="muted">{{ $t('admin.hidden') }}</UiTag>
            <div style="flex: 1" />
            <button class="lk" @click="openSubNew(c.id)">{{ $t('admin.addSub') }}</button>
            <button class="lk" @click="openCatEdit(c)">{{ $t('common.edit') }}</button>
            <button class="lk" :style="{ color: c.active ? 'var(--neg)' : 'var(--accent)' }" @click="toggleCat(c)">{{ c.active ? $t('admin.hide') : $t('admin.show') }}</button>
          </div>
          <div v-if="c.subs.length" style="display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0 2px 22px">
            <span v-for="s in c.subs" :key="s.id"
              :style="{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 8px', borderRadius: '99px', border: '1px solid var(--border-2)', fontSize: '12px', opacity: s.active ? 1 : 0.5 }">
              {{ cats.subLabel(c.id, s.id) }}
              <button class="lk" style="font-size: 11px" @click="openSubEdit(s, c.id)">{{ $t('common.edit') }}</button>
              <button class="lk" style="font-size: 11px" :style="{ color: s.active ? 'var(--neg)' : 'var(--accent)' }" @click="toggleSub(s)">{{ s.active ? $t('admin.hide') : $t('admin.show') }}</button>
            </span>
          </div>
        </div>
      </div>
    </UiCard>

    <!-- Assistant configuration -->
    <UiCard :pad="22">
      <UiSectionTitle>{{ $t('admin.assistant') }}</UiSectionTitle>
      <p style="font-size: 13px; color: var(--muted); margin-bottom: 14px">{{ $t('admin.assistantSub') }}</p>
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-top: 1px solid var(--border)">
        <span style="font-size: 14px; font-weight: 540">{{ $t('admin.enabled') }}</span>
        <UiToggle v-model="asstCfg.enabled" />
      </div>
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-top: 1px solid var(--border); margin-bottom: 12px">
        <span style="font-size: 14px; font-weight: 540">{{ $t('admin.useCloud') }}</span>
        <UiToggle v-model="asstCfg.useCloud" />
      </div>
      <UiField :label="$t('admin.server')" style="margin-bottom: 12px"><UiInput v-model="asstCfg.baseUrl" placeholder="http://192.168.1.203:11434" /></UiField>
      <UiField :label="$t('admin.model')" style="margin-bottom: 12px"><UiInput v-model="asstCfg.model" placeholder="minimax-m3:cloud" /></UiField>
      <UiField v-if="asstCfg.useCloud" :label="$t('admin.token')" style="margin-bottom: 16px"><UiInput v-model="asstCfg.token" type="password" autocomplete="off" placeholder="••••••••" /></UiField>
      <UiButton :icon="savingCfg ? undefined : 'check'" :disabled="savingCfg" @click="saveAsstCfg">{{ savingCfg ? $t('common.saving') : $t('common.save') }}</UiButton>
    </UiCard>

    <!-- Members' conversations -->
    <UiCard :pad="22">
      <UiSectionTitle>{{ $t('admin.conversations') }}</UiSectionTitle>
      <p style="font-size: 13px; color: var(--muted); margin-bottom: 8px">{{ $t('admin.conversationsSub') }}</p>
      <div style="display: flex; flex-direction: column">
        <div v-for="c in allConvs" :key="c.id" style="display: flex; align-items: center; gap: 10px; padding: 11px 2px; border-top: 1px solid var(--border)">
          <UiIcon name="chat" :size="15" style="color: var(--muted); flex-shrink: 0" />
          <div style="flex: 1; min-width: 0">
            <div style="font-weight: 600; font-size: 13.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{{ c.title }}</div>
            <div style="font-size: 12px; color: var(--muted)">{{ c.userName }} · {{ $d(new Date(c.updatedAt), 'long') }}</div>
          </div>
          <UiIconButton name="arrowUR" :label="$t('common.edit')" @click="openConv(c)" />
          <UiIconButton name="trash" :label="$t('common.delete')" @click="delConv(c)" />
        </div>
        <div v-if="!allConvs.length" style="font-size: 13px; color: var(--muted); padding: 8px 2px">{{ $t('admin.noConversations') }}</div>
      </div>
    </UiCard>

    <!-- Read-only conversation viewer -->
    <UiModal :open="convView.open" :title="convView.title" :width="640" @close="convView.open = false">
      <div style="padding: 18px 20px">
        <div style="font-size: 12.5px; color: var(--muted); background: var(--surface-2); padding: 8px 12px; border-radius: var(--radius-sm); margin-bottom: 16px">
          {{ $t('admin.viewingOther') }} · {{ convView.userName }}
        </div>
        <div v-for="m in convView.messages" :key="m.id" style="margin-bottom: 16px">
          <div v-if="m.role === 'user'" style="display: flex; justify-content: flex-end">
            <div style="max-width: 80%; background: var(--accent); color: var(--accent-ink); padding: 9px 13px; border-radius: 14px 14px 4px 14px; font-size: 14px; white-space: pre-wrap">{{ m.content }}</div>
          </div>
          <div v-else style="display: flex; flex-direction: column; gap: 6px">
            <template v-for="(seg, i) in m.segments" :key="i">
              <div v-if="seg.type === 'text' && seg.text" class="md" v-html="renderMarkdown(seg.text)" />
              <div v-else-if="seg.type === 'tool'">
                <span style="display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; padding: 3px 9px; border-radius: 99px; background: var(--surface-2); color: var(--ink-2)">
                  <UiIcon name="check" :size="12" style="color: var(--pos)" />{{ seg.label }}
                </span>
              </div>
              <ChatChartCard v-else-if="seg.type === 'card' && seg.card.kind === 'chart'" :card="seg.card" />
              <div v-else-if="seg.type === 'card'" style="font-size: 12.5px; color: var(--ink-2); border: 1px solid var(--border-2); border-radius: var(--radius-sm); padding: 8px 12px">{{ seg.card.summary }}</div>
            </template>
          </div>
        </div>
      </div>
    </UiModal>

    <!-- Category modal -->
    <UiModal :open="catModal.open" :title="catModal.id ? $t('admin.editCategory') : $t('admin.addCategory')" :width="460" @close="catModal.open = false">
      <form style="padding: 22px" @submit.prevent="saveCat">
        <UiField :label="$t('lang.en-US')" style="margin-bottom: 12px"><UiInput v-model="catModal.names.en" /></UiField>
        <UiField :label="$t('lang.pt-PT')" style="margin-bottom: 12px"><UiInput v-model="catModal.names.pt" /></UiField>
        <UiField :label="$t('lang.es-ES')" style="margin-bottom: 10px"><UiInput v-model="catModal.names.es" /></UiField>
        <div v-if="assistantEnabled" style="margin-bottom: 14px">
          <UiButton variant="subtle" size="sm" icon="sparkles" type="button" :disabled="catNameEmpty || translating" @click="translateNames(catModal)">{{ translating ? $t('common.processing') : $t('admin.autoTranslate') }}</UiButton>
        </div>
        <UiField :label="$t('admin.description')" :hint="$t('admin.descriptionHint')" style="margin-bottom: 14px">
          <textarea v-model="catModal.description" rows="2" :placeholder="$t('admin.descriptionPlaceholder')"
            style="width: 100%; resize: vertical; font-family: inherit; font-size: 14px; padding: 9px 11px; border: 1px solid var(--border-2); border-radius: var(--radius-sm); background: var(--surface); color: var(--ink)" />
        </UiField>
        <UiField :label="$t('admin.color')" style="margin-bottom: 18px">
          <div style="display: flex; flex-direction: column; gap: 7px">
            <div v-for="(row, ri) in CATEGORY_PALETTE" :key="ri" style="display: flex; gap: 7px">
              <button v-for="h in row" :key="h" type="button" :title="`${h}°`" @click="catModal.hue = h"
                :style="{ width: '28px', height: '28px', borderRadius: '50%', background: catColor(h, isDark), cursor: 'pointer', flexShrink: 0, border: catModal.hue === h ? '2px solid var(--ink)' : '2px solid transparent', boxShadow: catModal.hue === h ? '0 0 0 1px var(--border-2)' : 'none' }" />
            </div>
          </div>
        </UiField>
        <div style="display: flex; gap: 10px; justify-content: flex-end">
          <UiButton variant="ghost" type="button" @click="catModal.open = false">{{ $t('common.cancel') }}</UiButton>
          <UiButton type="submit" icon="check" :disabled="catNameEmpty">{{ $t('common.save') }}</UiButton>
        </div>
      </form>
    </UiModal>

    <!-- Subcategory modal -->
    <UiModal :open="subModal.open" :title="subModal.id ? $t('admin.editSub') : $t('admin.addSub')" :width="420" @close="subModal.open = false">
      <form style="padding: 22px" @submit.prevent="saveSub">
        <UiField :label="$t('lang.en-US')" style="margin-bottom: 12px"><UiInput v-model="subModal.names.en" /></UiField>
        <UiField :label="$t('lang.pt-PT')" style="margin-bottom: 12px"><UiInput v-model="subModal.names.pt" /></UiField>
        <UiField :label="$t('lang.es-ES')" style="margin-bottom: 10px"><UiInput v-model="subModal.names.es" /></UiField>
        <div v-if="assistantEnabled" style="margin-bottom: 14px">
          <UiButton variant="subtle" size="sm" icon="sparkles" type="button" :disabled="subNameEmpty || translating" @click="translateNames(subModal)">{{ translating ? $t('common.processing') : $t('admin.autoTranslate') }}</UiButton>
        </div>
        <UiField :label="$t('admin.description')" :hint="$t('admin.descriptionHint')" style="margin-bottom: 16px">
          <textarea v-model="subModal.description" rows="2" :placeholder="$t('admin.descriptionPlaceholder')"
            style="width: 100%; resize: vertical; font-family: inherit; font-size: 14px; padding: 9px 11px; border: 1px solid var(--border-2); border-radius: var(--radius-sm); background: var(--surface); color: var(--ink)" />
        </UiField>
        <div style="display: flex; gap: 10px; justify-content: flex-end">
          <UiButton variant="ghost" type="button" @click="subModal.open = false">{{ $t('common.cancel') }}</UiButton>
          <UiButton type="submit" icon="check" :disabled="subNameEmpty">{{ $t('common.save') }}</UiButton>
        </div>
      </form>
    </UiModal>

    <UiCard :pad="22">
      <UiSectionTitle>{{ $t('admin.forcedLanguage') }}</UiSectionTitle>
      <p style="font-size: 13px; color: var(--muted); margin-bottom: 14px">{{ $t('admin.forcedLanguageHint') }}</p>
      <div style="max-width: 260px">
        <UiSelect :model-value="forced" @update:model-value="changeForced($event)">
          <option v-for="o in langOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
        </UiSelect>
      </div>
    </UiCard>

    <!-- Data export / import -->
    <UiCard :pad="22">
      <UiSectionTitle>{{ $t('admin.dataTitle') }}</UiSectionTitle>
      <p style="font-size: 13px; color: var(--muted); margin-bottom: 14px">{{ $t('admin.dataSub') }}</p>

      <div style="display: flex; flex-direction: column; gap: 14px">
        <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap; padding: 12px 2px; border-top: 1px solid var(--border)">
          <div style="flex: 1; min-width: 220px">
            <div style="font-weight: 600; font-size: 14px">{{ $t('admin.dataTotal') }}</div>
            <div style="font-size: 12.5px; color: var(--muted); margin-top: 2px">{{ $t('admin.dataTotalSub') }}</div>
          </div>
          <UiButton variant="outline" size="sm" icon="logout" @click="exportData('total')">{{ $t('admin.export') }}</UiButton>
          <UiButton variant="danger" size="sm" icon="plus" @click="pickImport('total')">{{ $t('admin.import') }}</UiButton>
        </div>
        <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap; padding: 12px 2px; border-top: 1px solid var(--border)">
          <div style="flex: 1; min-width: 220px">
            <div style="font-weight: 600; font-size: 14px">{{ $t('admin.dataPartial') }}</div>
            <div style="font-size: 12.5px; color: var(--muted); margin-top: 2px">{{ $t('admin.dataPartialSub') }}</div>
          </div>
          <UiButton variant="outline" size="sm" icon="logout" @click="exportData('parcial')">{{ $t('admin.export') }}</UiButton>
          <UiButton variant="outline" size="sm" icon="plus" @click="pickImport('parcial')">{{ $t('admin.import') }}</UiButton>
        </div>
      </div>
      <p style="font-size: 12px; color: var(--faint); margin-top: 12px">{{ $t('admin.dataSensitive') }}</p>
      <input ref="importInput" type="file" accept="application/json,.json" style="display: none" @change="onImportFile" />
    </UiCard>

    <!-- Import confirm modal -->
    <UiModal :open="imp.open" :title="imp.kind === 'total' ? $t('admin.importTotalTitle') : $t('admin.importPartialTitle')" :width="480" @close="imp.open = false">
      <div style="padding: 22px">
        <template v-if="imp.payload">
          <div v-if="imp.kind === 'total'"
            style="display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; border-radius: var(--radius-sm); background: color-mix(in oklab, var(--neg) 10%, transparent); color: var(--neg); font-size: 13.5px; font-weight: 540; margin-bottom: 16px">
            <UiIcon name="bell" :size="18" style="flex-shrink: 0; margin-top: 1px" />
            <span>{{ $t('admin.importTotalWarn') }}</span>
          </div>
          <p v-else style="font-size: 13.5px; color: var(--ink-2); margin-bottom: 16px">{{ $t('admin.importPartialInfo') }}</p>

          <div v-if="imp.counts.length" style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 18px">
            <div v-for="c in imp.counts" :key="c.label" style="display: flex; justify-content: space-between; font-size: 13.5px; padding: 6px 10px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface-2)">
              <span>{{ c.label }}</span><span class="tnum" style="font-weight: 600">{{ c.n }}</span>
            </div>
          </div>
        </template>

        <div v-if="imp.error" style="color: var(--neg); font-size: 13px; margin-bottom: 12px">{{ imp.error }}</div>
        <div v-if="imp.result" style="color: var(--pos); font-size: 13.5px; font-weight: 540; margin-bottom: 12px">{{ imp.result }}</div>

        <div style="display: flex; gap: 10px; justify-content: flex-end">
          <UiButton variant="ghost" type="button" @click="imp.open = false">{{ imp.result ? $t('common.close') : $t('common.cancel') }}</UiButton>
          <UiButton v-if="imp.payload" :variant="imp.kind === 'total' ? 'danger' : 'primary'" :disabled="imp.busy"
            :icon="imp.busy ? undefined : 'check'" @click="confirmImport">
            {{ imp.busy ? $t('common.processing') : (imp.kind === 'total' ? $t('admin.importReplaceAll') : $t('admin.import')) }}
          </UiButton>
        </div>
      </div>
    </UiModal>

    <!-- Add modal -->
    <UiModal :open="addOpen" :title="$t('admin.addMemberTitle')" :width="460" @close="addOpen = false">
      <form style="padding: 22px" @submit.prevent="addMember">
        <UiField :label="$t('profile.name')" style="margin-bottom: 14px"><UiInput v-model="form.name" :placeholder="$t('admin.namePlaceholder')" autocomplete="name" required /></UiField>
        <UiField :label="$t('auth.email')" style="margin-bottom: 14px"><UiInput v-model="form.email" type="email" placeholder="nome@casa.pt" autocomplete="off" required /></UiField>
        <UiField :label="$t('admin.tempPassword')" :hint="$t('admin.tempPasswordHint')" style="margin-bottom: 14px">
          <UiInput v-model="form.password" type="password" :placeholder="$t('admin.passwordPlaceholder')" autocomplete="new-password" required />
        </UiField>
        <UiField :label="$t('admin.role')" style="margin-bottom: 18px">
          <UiSegmented v-model="form.role" :options="[{ value: 'user', label: $t('layout.member') }, { value: 'admin', label: $t('layout.administrator') }]" />
        </UiField>
        <div v-if="addError" style="color: var(--neg); font-size: 13px; margin-bottom: 12px">{{ addError }}</div>
        <div style="display: flex; gap: 10px; justify-content: flex-end">
          <UiButton variant="ghost" type="button" @click="addOpen = false">{{ $t('common.cancel') }}</UiButton>
          <UiButton type="submit" :icon="adding ? undefined : 'check'">{{ adding ? $t('auth.creating') : $t('admin.createMember') }}</UiButton>
        </div>
      </form>
    </UiModal>

    <!-- Edit modal -->
    <UiModal :open="edit.open" :title="$t('admin.editMemberTitle')" :width="460" @close="edit.open = false">
      <form style="padding: 22px" @submit.prevent="saveEdit">
        <UiField :label="$t('profile.name')" style="margin-bottom: 14px"><UiInput v-model="edit.name" required /></UiField>
        <UiField :label="$t('admin.role')" style="margin-bottom: 14px">
          <UiSegmented v-model="edit.role" :options="[{ value: 'user', label: $t('layout.member') }, { value: 'admin', label: $t('layout.administrator') }]" />
        </UiField>
        <UiField :label="$t('profile.newPassword')" :hint="$t('admin.editPasswordHint')" style="margin-bottom: 18px">
          <UiInput v-model="edit.password" type="password" :placeholder="$t('admin.passwordPlaceholder')" autocomplete="new-password" />
        </UiField>
        <div v-if="editError" style="color: var(--neg); font-size: 13px; margin-bottom: 12px">{{ editError }}</div>
        <div style="display: flex; gap: 10px; align-items: center">
          <UiButton v-if="edit.id !== user?.id" variant="danger" type="button" icon="trash" @click="removeMember(edit.id)">{{ $t('admin.remove') }}</UiButton>
          <div style="flex: 1" />
          <UiButton variant="ghost" type="button" @click="edit.open = false">{{ $t('common.cancel') }}</UiButton>
          <UiButton type="submit" icon="check">{{ $t('common.save') }}</UiButton>
        </div>
      </form>
    </UiModal>
  </div>
</template>

<style scoped>
.lk {
  background: none;
  border: none;
  color: var(--accent);
  font-weight: 600;
  font-size: 12.5px;
  cursor: pointer;
  padding: 2px 4px;
}
.lk:hover { text-decoration: underline; }
</style>
