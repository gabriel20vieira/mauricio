import { randomUUID } from 'node:crypto'
import { asc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, schema } from '../../utils/db'
import { ollamaChat, ollamaComplete, type OllamaMessage } from '../../utils/ollama'
import { TOOLS, runTool, systemPrompt, type Card } from '../../utils/aiTools'

const Body = z.object({
  conversationId: z.string().optional(),
  message: z.string().min(1).max(4000),
  locale: z.string().optional(), // active UI locale → assistant replies in it
})

const MAX_ITERS = 6

const TITLE_LANG: Record<string, string> = { 'pt-PT': 'português', 'es-ES': 'español', 'en-US': 'English' }

// Short AI title from the first exchange. Throws on failure → caller keeps the
// truncated-message fallback already stored.
async function generateTitle(message: string, reply: string, locale?: string): Promise<string> {
  const lang = TITLE_LANG[locale || ''] || 'English'
  const raw = await ollamaComplete([
    { role: 'system', content: `Generate a very short conversation title (max 5 words) in ${lang}. Reply with ONLY the title — no quotes, no trailing punctuation, no explanation.` },
    { role: 'user', content: `${message}\n\n${(reply || '').slice(0, 400)}` },
  ], { signal: AbortSignal.timeout(15_000) })
  return raw.trim().replace(/^["'“”]+|["'“”.]+$/g, '').replace(/\s+/g, ' ').slice(0, 80)
}

export default defineEventHandler(async (event) => {
  const user = await requireDbUser(event)
  if (!getAssistantConfig().enabled) throw createError({ statusCode: 403, statusMessage: 'O assistente está desativado.' })
  // Each message fans out to several Ollama calls — throttle to limit cost/abuse.
  rateLimit(event, { key: 'chat', limit: 20, windowMs: 60_000 })
  const body = await readValidatedBody(event, Body.parse)
  const now = Date.now()

  // Ensure conversation (owned by user).
  let convId = body.conversationId
  const isNewConversation = !convId
  if (convId) {
    const owned = db.select().from(schema.chatConversations)
      .where(eq(schema.chatConversations.id, convId)).get()
    if (!owned || owned.userId !== user.id) throw createError({ statusCode: 404, statusMessage: 'Conversa não encontrada.' })
  } else {
    convId = randomUUID()
    db.insert(schema.chatConversations).values({
      id: convId, userId: user.id,
      // Fallback title (truncated first message); replaced by an AI title below.
      title: body.message.slice(0, 60), createdAt: now, updatedAt: now,
    }).run()
  }

  // Persist the user turn.
  db.insert(schema.chatMessages).values({
    id: randomUUID(), conversationId: convId, role: 'user', content: body.message, createdAt: Date.now(),
  }).run()

  // Build model history from stored turns (cap to recent).
  const stored = db.select().from(schema.chatMessages)
    .where(eq(schema.chatMessages.conversationId, convId))
    .orderBy(asc(schema.chatMessages.createdAt)).all()
  const recent = stored.slice(-40)
  const messages: OllamaMessage[] = [{ role: 'system', content: systemPrompt(user as any, body.locale) }]
  for (const m of recent) {
    if (m.role === 'assistant') {
      messages.push({ role: 'assistant', content: m.content, tool_calls: m.toolCalls ? JSON.parse(m.toolCalls) : undefined })
    } else if (m.role === 'tool') {
      messages.push({ role: 'tool', content: m.content, tool_name: m.toolName || undefined })
    } else {
      messages.push({ role: 'user', content: m.content })
    }
  }

  // ---- SSE setup ----
  const res = event.node.res
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  const send = (obj: any) => res.write(`data: ${JSON.stringify(obj)}\n\n`)
  send({ type: 'start', conversationId: convId })

  const cards: Card[] = []
  // Ordered render segments (text / tool / card) — interleaved so the UI can show
  // the assistant's reasoning line by line, live and on history reload.
  const segments: any[] = []
  let finalContent = ''
  let lastAssistantId = ''

  try {
    for (let iter = 0; iter < MAX_ITERS; iter++) {
      const { content, toolCalls } = await ollamaChat(messages, TOOLS, t => send({ type: 'token', text: t }))

      // Persist + echo the assistant turn.
      const aId = randomUUID()
      lastAssistantId = aId
      db.insert(schema.chatMessages).values({
        id: aId, conversationId: convId, role: 'assistant', content,
        toolCalls: toolCalls.length ? JSON.stringify(toolCalls) : null, createdAt: Date.now(),
      }).run()
      messages.push({ role: 'assistant', content, tool_calls: toolCalls.length ? toolCalls : undefined })
      if (content) segments.push({ type: 'text', text: content })

      if (!toolCalls.length) { finalContent = content; break }

      // Execute each tool; feed results back.
      for (const tc of toolCalls) {
        send({ type: 'tool', name: tc.function.name, status: 'running' })
        const outcome = await runTool(tc.function.name, tc.function.arguments, user as any, event, body.locale)
        send({ type: 'tool', name: tc.function.name, status: 'done', label: outcome.label })
        segments.push({ type: 'tool', name: tc.function.name, label: outcome.label })
        if (outcome.card) { cards.push(outcome.card); segments.push({ type: 'card', card: outcome.card }); send({ type: 'card', card: outcome.card }) }
        const toolContent = JSON.stringify(outcome.result)
        db.insert(schema.chatMessages).values({
          id: randomUUID(), conversationId: convId, role: 'tool', content: toolContent,
          toolCallId: tc.id || null, toolName: tc.function.name, createdAt: Date.now(),
        }).run()
        messages.push({ role: 'tool', content: toolContent, tool_name: tc.function.name })
      }

      if (iter === MAX_ITERS - 1) {
        finalContent = content || 'Cheguei ao limite de passos. Reformula se precisares.'
      }
    }

    // Store the ordered segments + cards on the last assistant row (the render record).
    if (lastAssistantId) {
      db.update(schema.chatMessages)
        .set({ segments: JSON.stringify(segments), cards: cards.length ? JSON.stringify(cards) : null, content: finalContent })
        .where(eq(schema.chatMessages.id, lastAssistantId)).run()
    }
    db.update(schema.chatConversations).set({ updatedAt: Date.now() }).where(eq(schema.chatConversations.id, convId)).run()

    // AI-generated title for new conversations (falls back to the truncated first
    // message already stored if generation fails).
    if (isNewConversation) {
      const title = await generateTitle(body.message, finalContent, body.locale).catch(() => '')
      if (title) {
        db.update(schema.chatConversations).set({ title }).where(eq(schema.chatConversations.id, convId)).run()
        send({ type: 'title', conversationId: convId, title })
      }
    }

    send({ type: 'done', conversationId: convId, content: finalContent, cards })
  } catch (err: any) {
    send({ type: 'error', message: err?.statusMessage || err?.message || 'Erro no assistente.' })
  }
  res.end()
})
