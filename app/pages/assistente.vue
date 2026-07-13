<script setup lang="ts">
import { streamChat, type Card, type ConversationMeta } from '~/composables/useChat'

definePageMeta({ titleKey: 'nav.assistant', subtitleKey: 'pageSub.assistant' })
const appName = useRuntimeConfig().public.appName
const { t, locale } = useI18n()
const assistantEnabled = useAssistantEnabled()
if (import.meta.client && !assistantEnabled.value) navigateTo('/')

// A response is an ordered list of segments so text / tool calls / cards interleave
// in reasoning order, both live and on history reload.
interface UiSegment {
  type: 'text' | 'tool' | 'card'
  text?: string // text
  name?: string // tool
  label?: string // tool
  done?: boolean // tool
  card?: Card // card
  status?: 'pending' | 'done' | 'error' // card (confirm)
  error?: string // card (confirm)
}
interface UiMessage {
  id: string
  role: 'user' | 'assistant'
  content?: string // user text
  segments: UiSegment[]
  streaming?: boolean
}

const store = useStore()
const conversations = ref<ConversationMeta[]>([])
const activeId = ref<string | null>(null)
const messages = ref<UiMessage[]>([])
const input = ref('')
const sending = ref(false)
const scroller = ref<HTMLElement | null>(null)
const convDrawer = ref(false) // mobile slide-over for the conversation list

const suggestions = computed(() => [
  t('assistant.suggestion1'),
  t('assistant.suggestion2'),
  t('assistant.suggestion3'),
  t('assistant.suggestion4'),
])

onMounted(async () => {
  await store.ensure().catch(() => {})
  await loadConversations()
})

async function loadConversations() {
  conversations.value = await $fetch<ConversationMeta[]>('/api/chat/conversations').catch(() => [])
}

async function openConversation(id: string) {
  activeId.value = id
  convDrawer.value = false
  const data = await $fetch<{ messages: any[] }>(`/api/chat/conversations/${id}`)
  messages.value = data.messages.map(m => m.role === 'user'
    ? { id: m.id, role: 'user', content: m.content, segments: [] }
    // A card segment persisted as confirmed rehydrates as status:'done' so the
    // confirm button is gone and it can't be re-added.
    : { id: m.id, role: 'assistant', segments: (m.segments || []).map((s: any) => ({ ...s, done: true, status: s.confirmed ? 'done' : s.status })) })
  scrollDown()
}

function newConversation() {
  activeId.value = null
  messages.value = []
  convDrawer.value = false
}

async function removeConversation(id: string) {
  await $fetch(`/api/chat/conversations/${id}`, { method: 'DELETE' }).catch(() => {})
  if (activeId.value === id) newConversation()
  await loadConversations()
}

function scrollDown() {
  nextTick(() => { if (scroller.value) scroller.value.scrollTop = scroller.value.scrollHeight })
}

async function send(text?: string) {
  const msg = (text ?? input.value).trim()
  if (!msg || sending.value) return
  input.value = ''
  sending.value = true
  messages.value.push({ id: 'u' + Date.now(), role: 'user', content: msg, segments: [] })
  const assistant = reactive<UiMessage>({ id: 'a' + Date.now(), role: 'assistant', segments: [], streaming: true })
  messages.value.push(assistant)
  scrollDown()

  const pushError = (m: string) => assistant.segments.push({ type: 'text', text: `⚠️ ${m}` })

  await streamChat({ conversationId: activeId.value || undefined, message: msg, locale: locale.value }, {
    onStart: (cid) => { activeId.value = cid },
    onToken: (t) => {
      const last = assistant.segments[assistant.segments.length - 1]
      if (last && last.type === 'text') last.text += t
      else assistant.segments.push({ type: 'text', text: t })
      scrollDown()
    },
    onTool: (name, status, label) => {
      if (status === 'running') assistant.segments.push({ type: 'tool', name, label: label || '', done: false })
      else {
        for (let i = assistant.segments.length - 1; i >= 0; i--) {
          const s = assistant.segments[i]
          if (s.type === 'tool' && !s.done) { s.done = true; if (label) s.label = label; break }
        }
      }
      scrollDown()
    },
    onCard: (card) => { assistant.segments.push({ type: 'card', card }); scrollDown() },
    onDone: async () => { assistant.streaming = false; await loadConversations() },
    onError: (m) => { assistant.streaming = false; pushError(m) },
  }).catch((e) => { assistant.streaming = false; pushError(e?.message || 'Erro') })

  sending.value = false
  scrollDown()
}

async function confirmCard(cs: UiSegment) {
  if (!cs.card || cs.card.kind !== 'confirm' || cs.status === 'done') return
  cs.status = 'pending'
  cs.error = undefined
  const p = cs.card.payload
  try {
    if (cs.card.action === 'add') {
      await store.addExpense({ date: p.date, amount: p.amount, cat: p.cat, sub: p.sub || '', note: p.note || '', method: p.method || '', who: p.who })
    } else if (cs.card.action === 'add_income') {
      await store.addIncome({ date: p.date, amount: p.amount, cat: p.cat, note: p.note || '', who: p.who })
    } else if (cs.card.action === 'update') {
      const { id, ...rest } = p
      await store.updateExpense(id, rest)
    } else if (cs.card.action === 'delete') {
      await store.deleteExpense(p.id)
    }
    cs.status = 'done'
    // Persist the confirmed state so reopening the conversation keeps it done.
    if (activeId.value && cs.card.id) {
      await $fetch('/api/chat/cards/confirm', { method: 'POST', body: { conversationId: activeId.value, cardId: cs.card.id } }).catch(() => {})
    }
  } catch (e: any) {
    cs.status = 'error'
    cs.error = e?.data?.statusMessage || e?.statusMessage || e?.message || 'Falhou.'
  }
}
</script>

<template>
  <div class="asst" :class="{ 'drawer-open': convDrawer }">
    <!-- Conversation list (slide-over on mobile) -->
    <div class="asst-scrim" @click="convDrawer = false" />
    <aside class="asst-convs">
      <UiButton icon="plus" full @click="newConversation">{{ $t('assistant.newConversation') }}</UiButton>
      <div class="asst-convs-list">
        <div v-for="c in conversations" :key="c.id" class="asst-conv"
          :class="{ active: activeId === c.id }"
          @click="openConversation(c.id)">
          <UiIcon name="chat" :size="15" style="flex-shrink: 0; opacity: 0.7" />
          <span class="asst-conv-title">{{ c.title }}</span>
          <button class="conv-del" :title="$t('common.delete')" @click.stop="removeConversation(c.id)">
            <UiIcon name="trash" :size="14" />
          </button>
        </div>
      </div>
    </aside>

    <!-- Thread -->
    <div class="asst-thread">
      <!-- Top bar: open conversation list (drawer) + start a new chat -->
      <div class="asst-bar">
        <UiButton variant="outline" size="sm" icon="chat" @click="convDrawer = true">{{ $t('assistant.conversations') }}</UiButton>
        <UiButton size="sm" icon="plus" @click="newConversation">{{ $t('assistant.newConversation') }}</UiButton>
      </div>
      <div ref="scroller" class="asst-scroll">
        <!-- Empty / welcome -->
        <div v-if="!messages.length" style="height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 14px">
          <div style="width: 56px; height: 56px; border-radius: 16px; background: var(--accent-soft); color: var(--accent); display: grid; place-items: center">
            <UiIcon name="sparkles" :size="28" />
          </div>
          <div>
            <div style="font-size: 17px; font-weight: 700">{{ $t('assistant.of', { name: appName }) }}</div>
            <div style="font-size: 13.5px; color: var(--muted); max-width: 360px; margin-top: 4px">{{ $t('assistant.welcomeSub') }}</div>
          </div>
          <div style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; max-width: 460px; margin-top: 6px">
            <button v-for="s in suggestions" :key="s"
              style="font-size: 12.5px; padding: 7px 12px; border-radius: 99px; border: 1px solid var(--border-2); background: var(--surface); color: var(--ink-2)"
              @click="send(s)">{{ s }}</button>
          </div>
        </div>

        <!-- Messages -->
        <div v-for="m in messages" :key="m.id" style="margin-bottom: 18px">
          <!-- user -->
          <div v-if="m.role === 'user'" style="display: flex; justify-content: flex-end">
            <div style="max-width: 78%; background: var(--accent); color: var(--accent-ink); padding: 10px 14px; border-radius: 14px 14px 4px 14px; font-size: 14.5px; white-space: pre-wrap">{{ m.content }}</div>
          </div>
          <!-- assistant -->
          <div v-else style="display: flex; gap: 10px">
            <div style="width: 30px; height: 30px; border-radius: 9px; background: var(--accent-soft); color: var(--accent); display: grid; place-items: center; flex-shrink: 0">
              <UiIcon name="sparkles" :size="17" />
            </div>
            <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8px">
              <!-- ordered segments: text / tool / card, interleaved -->
              <template v-for="(seg, i) in m.segments" :key="i">
                <!-- text (markdown) -->
                <div v-if="seg.type === 'text' && seg.text" class="md" v-html="renderMarkdown(seg.text)" />
                <!-- tool chip (its own line) -->
                <div v-else-if="seg.type === 'tool'">
                  <span style="display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; padding: 3px 9px; border-radius: 99px; background: var(--surface-2); color: var(--ink-2)">
                    <UiIcon :name="seg.done ? 'check' : 'search'" :size="12" :style="{ color: seg.done ? 'var(--pos)' : 'var(--muted)' }" />{{ seg.label || $t('assistant.working') }}
                  </span>
                </div>
                <!-- card -->
                <ChatChartCard v-else-if="seg.type === 'card' && seg.card!.kind === 'chart'" :card="seg.card" />
                <ChatConfirmCard v-else-if="seg.type === 'card'" :card="seg.card" :status="seg.status" :error="seg.error" @confirm="confirmCard(seg)" />
              </template>
              <div v-if="m.streaming && !m.segments.length" style="font-size: 14px; color: var(--muted)">{{ $t('assistant.thinking') }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Composer -->
      <div class="asst-composer">
        <textarea v-model="input" rows="1" :placeholder="$t('assistant.placeholder')"
          @keydown.enter.exact.prevent="send()" />
        <UiButton icon="send" :disabled="sending || !input.trim()" @click="send()">{{ $t('assistant.send') }}</UiButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Single-column thread with a slide-over conversation list on every size.
   Fills the main content area; inner panes scroll, not the page. */
.asst {
  position: relative;
  height: 100%;
  min-height: 0;
  overflow: hidden; /* clips the drawer when closed */
  display: flex;
}

/* Conversation list — left slide-over, anchored to the assistant area
   (absolute, not fixed) so it never covers the app's main sidebar. */
.asst-convs {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 30;
  width: 280px;
  max-width: 84vw;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 14px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  transform: translateX(calc(-100% - 24px));
  transition: transform 0.26s cubic-bezier(.4, 0, .2, 1);
}
.asst.drawer-open .asst-convs { transform: none; }
.asst-scrim {
  position: absolute;
  inset: 0;
  z-index: 20;
  border-radius: var(--radius);
  background: oklch(0.15 0.01 80 / 0.4);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.26s;
}
.asst.drawer-open .asst-scrim { opacity: 1; pointer-events: auto; }

.asst-convs-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-top: 4px;
}
.asst-conv {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 13.5px;
  color: var(--ink-2);
}
.asst-conv:hover { background: var(--surface-2); }
.asst-conv.active { background: var(--accent-soft); color: var(--accent); }
.asst-conv-title { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.conv-del { background: none; border: none; color: var(--muted); display: grid; place-items: center; padding: 2px; opacity: 0; transition: opacity 0.15s; }
.asst-conv:hover .conv-del { opacity: 1; }
.conv-del:hover { color: var(--neg); }

.asst-thread {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  overflow: hidden;
}
.asst-bar {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
}
.asst-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 22px;
}
.asst-composer {
  border-top: 1px solid var(--border);
  padding: 12px;
  display: flex;
  gap: 8px;
  align-items: flex-end;
}
.asst-composer textarea {
  flex: 1;
  resize: none;
  max-height: 120px;
  padding: 11px 13px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-2);
  background: var(--surface);
  color: var(--ink);
  font-size: 14.5px;
  outline: none;
  font-family: inherit;
}

@media (max-width: 760px) {
  .asst-scroll { padding: 16px; }
}

/* Markdown rendering of assistant text */
.md {
  font-size: 14.5px;
  line-height: 1.55;
  color: var(--ink);
  word-break: break-word;
}
.md :deep(p) { margin: 0 0 8px; }
.md :deep(p:last-child) { margin-bottom: 0; }
.md :deep(ul), .md :deep(ol) { margin: 4px 0 8px; padding-left: 20px; }
.md :deep(li) { margin: 2px 0; }
.md :deep(strong) { font-weight: 650; }
.md :deep(em) { font-style: italic; }
.md :deep(a) { color: var(--accent); text-decoration: underline; }
.md :deep(h1), .md :deep(h2), .md :deep(h3) { font-size: 15px; font-weight: 700; margin: 10px 0 6px; }
.md :deep(code) { font-family: var(--mono); font-size: 0.88em; background: var(--surface-2); padding: 1px 5px; border-radius: 5px; }
.md :deep(pre) { background: var(--surface-2); padding: 10px 12px; border-radius: var(--radius-sm); overflow-x: auto; margin: 6px 0; }
.md :deep(pre code) { background: none; padding: 0; }
.md :deep(blockquote) { border-left: 3px solid var(--border-2); margin: 6px 0; padding: 2px 0 2px 12px; color: var(--ink-2); }
.md :deep(table) { border-collapse: collapse; font-size: 13px; margin: 6px 0; }
.md :deep(th), .md :deep(td) { border: 1px solid var(--border); padding: 4px 8px; text-align: left; }
.md :deep(hr) { border: none; border-top: 1px solid var(--border); margin: 10px 0; }
</style>
