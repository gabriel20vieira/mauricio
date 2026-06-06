<script setup lang="ts">
import { streamChat, type Card, type ConversationMeta } from '~/composables/useChat'

usePageHeader('Assistente', 'Pergunta sobre as contas da casa')

interface UiCardState { card: Card, status?: 'pending' | 'done' | 'error', error?: string }
interface UiMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  cards: UiCardState[]
  tools?: { label: string, done: boolean }[]
  streaming?: boolean
}

const store = useStore()
const conversations = ref<ConversationMeta[]>([])
const activeId = ref<string | null>(null)
const messages = ref<UiMessage[]>([])
const input = ref('')
const sending = ref(false)
const scroller = ref<HTMLElement | null>(null)

const suggestions = [
  'Quanto gastámos este mês?',
  'Mostra um gráfico dos gastos por categoria',
  'Quem contribuiu mais este mês?',
  'Adiciona um gasto de 25€ em alimentação fora, jantar',
]

onMounted(async () => {
  await store.ensure().catch(() => {})
  await loadConversations()
})

async function loadConversations() {
  conversations.value = await $fetch<ConversationMeta[]>('/api/chat/conversations').catch(() => [])
}

async function openConversation(id: string) {
  activeId.value = id
  const data = await $fetch<{ messages: any[] }>(`/api/chat/conversations/${id}`)
  messages.value = data.messages.map(m => ({
    id: m.id, role: m.role, content: m.content,
    cards: (m.cards || []).map((c: Card) => ({ card: c })),
  }))
  scrollDown()
}

function newConversation() {
  activeId.value = null
  messages.value = []
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
  messages.value.push({ id: 'u' + Date.now(), role: 'user', content: msg, cards: [] })
  const assistant = reactive<UiMessage>({ id: 'a' + Date.now(), role: 'assistant', content: '', cards: [], tools: [], streaming: true })
  messages.value.push(assistant)
  scrollDown()

  await streamChat({ conversationId: activeId.value || undefined, message: msg }, {
    onStart: (cid) => { activeId.value = cid },
    onToken: (t) => { assistant.content += t; scrollDown() },
    onTool: (_name, status, label) => {
      if (status === 'running') assistant.tools!.push({ label: label || 'A trabalhar…', done: false })
      else { const last = assistant.tools![assistant.tools!.length - 1]; if (last) { last.done = true; if (label) last.label = label } }
      scrollDown()
    },
    onCard: (card) => { assistant.cards.push({ card }); scrollDown() },
    onDone: async () => { assistant.streaming = false; await loadConversations() },
    onError: (m) => { assistant.streaming = false; assistant.content = assistant.content || `⚠️ ${m}` },
  }).catch((e) => { assistant.streaming = false; assistant.content = assistant.content || `⚠️ ${e?.message || 'Erro'}` })

  sending.value = false
  scrollDown()
}

async function confirmCard(cs: UiCardState) {
  if (cs.card.kind !== 'confirm' || cs.status === 'done') return
  cs.status = 'pending'
  cs.error = undefined
  const p = cs.card.payload
  try {
    if (cs.card.action === 'add') {
      await store.addExpense({ date: p.date, amount: p.amount, cat: p.cat, sub: p.sub || '', note: p.note || '', method: p.method || '', who: p.who })
    } else if (cs.card.action === 'update') {
      const { id, ...rest } = p
      await store.updateExpense(id, rest)
    } else if (cs.card.action === 'delete') {
      await store.deleteExpense(p.id)
    }
    cs.status = 'done'
  } catch (e: any) {
    cs.status = 'error'
    cs.error = e?.data?.statusMessage || e?.statusMessage || e?.message || 'Falhou.'
  }
}
</script>

<template>
  <div class="assistant-wrap" style="display: flex; gap: 16px; height: calc(100dvh - 150px); min-height: 420px">
    <!-- Conversation list -->
    <aside class="conv-list" style="width: 240px; flex-shrink: 0; display: flex; flex-direction: column; gap: 8px">
      <UiButton icon="plus" full @click="newConversation">Nova conversa</UiButton>
      <div style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 3px; margin-top: 4px">
        <div v-for="c in conversations" :key="c.id"
          :style="{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 10px', borderRadius: 'var(--radius-sm)',
            cursor: 'pointer', fontSize: '13.5px', background: activeId === c.id ? 'var(--accent-soft)' : 'transparent',
            color: activeId === c.id ? 'var(--accent)' : 'var(--ink-2)',
          }"
          @click="openConversation(c.id)">
          <UiIcon name="chat" :size="15" style="flex-shrink: 0; opacity: 0.7" />
          <span style="flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{{ c.title }}</span>
          <button class="conv-del" style="background: none; border: none; color: var(--muted); display: grid; place-items: center; padding: 2px"
            title="Apagar" @click.stop="removeConversation(c.id)">
            <UiIcon name="trash" :size="14" />
          </button>
        </div>
      </div>
    </aside>

    <!-- Thread -->
    <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); overflow: hidden">
      <div ref="scroller" style="flex: 1; overflow-y: auto; padding: 22px">
        <!-- Empty / welcome -->
        <div v-if="!messages.length" style="height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 14px">
          <div style="width: 56px; height: 56px; border-radius: 16px; background: var(--accent-soft); color: var(--accent); display: grid; place-items: center">
            <UiIcon name="sparkles" :size="28" />
          </div>
          <div>
            <div style="font-size: 17px; font-weight: 700">Assistente do Lar</div>
            <div style="font-size: 13.5px; color: var(--muted); max-width: 360px; margin-top: 4px">Pergunta sobre gastos, pede gráficos ou diz para adicionar um gasto — eu mostro uma confirmação antes de gravar.</div>
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
            <div style="flex: 1; min-width: 0">
              <!-- tool chips -->
              <div v-if="m.tools && m.tools.length" style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px">
                <span v-for="(t, i) in m.tools" :key="i"
                  style="display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; padding: 3px 9px; border-radius: 99px; background: var(--surface-2); color: var(--ink-2)">
                  <UiIcon :name="t.done ? 'check' : 'search'" :size="12" :style="{ color: t.done ? 'var(--pos)' : 'var(--muted)' }" />{{ t.label }}
                </span>
              </div>
              <div v-if="m.content" style="font-size: 14.5px; line-height: 1.5; white-space: pre-wrap; color: var(--ink)">{{ m.content }}</div>
              <div v-else-if="m.streaming && !(m.tools && m.tools.length)" style="font-size: 14px; color: var(--muted)">A pensar…</div>

              <!-- cards -->
              <template v-for="(cs, i) in m.cards" :key="i">
                <ChatChartCard v-if="cs.card.kind === 'chart'" :card="cs.card" />
                <ChatConfirmCard v-else :card="cs.card" :status="cs.status" :error="cs.error" @confirm="confirmCard(cs)" />
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- Composer -->
      <div style="border-top: 1px solid var(--border); padding: 12px; display: flex; gap: 8px; align-items: flex-end">
        <textarea v-model="input" rows="1" placeholder="Escreve uma mensagem…"
          style="flex: 1; resize: none; max-height: 120px; padding: 11px 13px; border-radius: var(--radius-sm); border: 1px solid var(--border-2); background: var(--surface); color: var(--ink); font-size: 14.5px; outline: none; font-family: inherit"
          @keydown.enter.exact.prevent="send()" />
        <UiButton icon="send" :disabled="sending || !input.trim()" @click="send()">Enviar</UiButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.conv-del { opacity: 0; transition: opacity 0.15s; }
.conv-list .conv-del:hover { color: var(--neg); }
div:hover > .conv-del { opacity: 1; }
@media (max-width: 760px) {
  .conv-list { display: none; }
  .assistant-wrap { height: calc(100dvh - 120px); }
}
</style>
