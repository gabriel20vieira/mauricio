<script setup lang="ts">
import { catColor, deviceLabel, relativeTime } from '~~/shared/config'
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
const catModal = reactive({ open: false, id: '', hue: 200, names: { en: '', pt: '', es: '' }, error: '' })
function openCatNew() { Object.assign(catModal, { open: true, id: '', hue: 200, names: { en: '', pt: '', es: '' }, error: '' }) }
function openCatEdit(c: any) { Object.assign(catModal, { open: true, id: c.id, hue: c.hue, names: { ...c.names }, error: '' }) }
const catNameEmpty = computed(() => !catModal.names.en && !catModal.names.pt && !catModal.names.es)
async function saveCat() {
  catModal.error = ''
  if (catNameEmpty.value) return
  try {
    if (catModal.id) await store.updateCategory(catModal.id, { names: catModal.names, hue: catModal.hue })
    else await store.addCategory({ names: catModal.names, hue: catModal.hue })
    catModal.open = false
  } catch (e: any) { catModal.error = e?.data?.statusMessage || 'Erro' }
}
async function toggleCat(c: any) {
  if (c.active) { if (!confirm(t('admin.hideWarning'))) return; await store.hideCategory(c.id) }
  else await store.updateCategory(c.id, { active: true })
}

const subModal = reactive({ open: false, id: '', categoryId: '', names: { en: '', pt: '', es: '' }, error: '' })
function openSubNew(categoryId: string) { Object.assign(subModal, { open: true, id: '', categoryId, names: { en: '', pt: '', es: '' }, error: '' }) }
function openSubEdit(s: any, categoryId: string) { Object.assign(subModal, { open: true, id: s.id, categoryId, names: { ...s.names }, error: '' }) }
async function saveSub() {
  subModal.error = ''
  if (!subModal.names.en && !subModal.names.pt && !subModal.names.es) { subModal.error = '!'; return }
  try {
    if (subModal.id) await store.updateSubcategory(subModal.id, { names: subModal.names })
    else await store.addSubcategory({ categoryId: subModal.categoryId, names: subModal.names })
    subModal.open = false
  } catch (e: any) { subModal.error = e?.data?.statusMessage || '!' }
}
const subNameEmpty = computed(() => !subModal.names.en && !subModal.names.pt && !subModal.names.es)
async function toggleSub(s: any) {
  if (s.active) { if (!confirm(t('admin.hideWarning'))) return; await store.hideSubcategory(s.id) }
  else await store.updateSubcategory(s.id, { active: true })
}

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

    <!-- Category modal -->
    <UiModal :open="catModal.open" :title="catModal.id ? $t('admin.editCategory') : $t('admin.addCategory')" :width="460" @close="catModal.open = false">
      <form style="padding: 22px" @submit.prevent="saveCat">
        <UiField :label="$t('lang.en-US')" style="margin-bottom: 12px"><UiInput v-model="catModal.names.en" /></UiField>
        <UiField :label="$t('lang.pt-PT')" style="margin-bottom: 12px"><UiInput v-model="catModal.names.pt" /></UiField>
        <UiField :label="$t('lang.es-ES')" style="margin-bottom: 14px"><UiInput v-model="catModal.names.es" /></UiField>
        <UiField :label="$t('admin.color')" style="margin-bottom: 18px">
          <div style="display: flex; align-items: center; gap: 12px">
            <input v-model.number="catModal.hue" type="range" min="0" max="360" style="flex: 1" />
            <span :style="{ width: '26px', height: '26px', borderRadius: '50%', background: catColor(catModal.hue, isDark), flexShrink: 0 }" />
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
        <UiField :label="$t('lang.es-ES')" style="margin-bottom: 18px"><UiInput v-model="subModal.names.es" /></UiField>
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
