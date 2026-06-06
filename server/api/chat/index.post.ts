import { randomUUID } from 'node:crypto'
import { asc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, schema } from '../../utils/db'
import { ollamaChat, type OllamaMessage } from '../../utils/ollama'
import { TOOLS, runTool, systemPrompt, type Card } from '../../utils/aiTools'

const Body = z.object({
  conversationId: z.string().optional(),
  message: z.string().min(1).max(4000),
})

const MAX_ITERS = 6

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const body = await readValidatedBody(event, Body.parse)
  const now = Date.now()

  // Ensure conversation (owned by user).
  let convId = body.conversationId
  if (convId) {
    const owned = db.select().from(schema.chatConversations)
      .where(eq(schema.chatConversations.id, convId)).get()
    if (!owned || owned.userId !== user.id) throw createError({ statusCode: 404, statusMessage: 'Conversa não encontrada.' })
  } else {
    convId = randomUUID()
    db.insert(schema.chatConversations).values({
      id: convId, userId: user.id,
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
  const messages: OllamaMessage[] = [{ role: 'system', content: systemPrompt(user as any) }]
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
  let finalContent = ''

  try {
    for (let iter = 0; iter < MAX_ITERS; iter++) {
      const { content, toolCalls } = await ollamaChat(messages, TOOLS, t => send({ type: 'token', text: t }))

      // Persist + echo the assistant turn.
      const aId = randomUUID()
      db.insert(schema.chatMessages).values({
        id: aId, conversationId: convId, role: 'assistant', content,
        toolCalls: toolCalls.length ? JSON.stringify(toolCalls) : null, createdAt: Date.now(),
      }).run()
      messages.push({ role: 'assistant', content, tool_calls: toolCalls.length ? toolCalls : undefined })

      if (!toolCalls.length) { finalContent = content; break }

      // Execute each tool; feed results back.
      for (const tc of toolCalls) {
        send({ type: 'tool', name: tc.function.name, status: 'running' })
        const outcome = await runTool(tc.function.name, tc.function.arguments, user as any, event)
        send({ type: 'tool', name: tc.function.name, status: 'done', label: outcome.label })
        if (outcome.card) { cards.push(outcome.card); send({ type: 'card', card: outcome.card }) }
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

    // Attach accumulated cards to the final assistant message + bump conversation.
    if (cards.length || finalContent) {
      const last = db.select().from(schema.chatMessages)
        .where(eq(schema.chatMessages.conversationId, convId))
        .orderBy(asc(schema.chatMessages.createdAt)).all().filter(m => m.role === 'assistant').pop()
      if (last && cards.length) {
        db.update(schema.chatMessages).set({ cards: JSON.stringify(cards) }).where(eq(schema.chatMessages.id, last.id)).run()
      }
    }
    db.update(schema.chatConversations).set({ updatedAt: Date.now() }).where(eq(schema.chatConversations.id, convId)).run()

    send({ type: 'done', conversationId: convId, content: finalContent, cards })
  } catch (err: any) {
    send({ type: 'error', message: err?.statusMessage || err?.message || 'Erro no assistente.' })
  }
  res.end()
})
