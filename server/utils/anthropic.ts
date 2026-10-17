// Anthropic (Claude) provider. Speaks the same Ollama-shaped messages/tools as
// ollama.ts so the chat handler and stored history stay provider-agnostic; the
// translation to Messages API blocks happens here.
import Anthropic from '@anthropic-ai/sdk'
import type { OllamaMessage, OllamaTool, OllamaToolCall } from './ollama'

// Server-side refusal fallback: on a policy decline the API retries on the model's
// default fallback inside the same call. Models without fallback support simply
// run alone, so it's safe for whatever model the admin picks.
const FALLBACK_BETA = 'server-side-fallback-2026-07-01'

export const ANTHROPIC_DEFAULT_MODEL = 'claude-opus-5-5'

export function anthropicClient(apiKey: string) {
  if (!apiKey) throw createError({ statusCode: 400, statusMessage: 'Falta a API key da Anthropic.' })
  return new Anthropic({ apiKey })
}

/** Models the key can use, newest first (as the API returns them). */
export async function anthropicModels(apiKey: string): Promise<{ id: string, name: string }[]> {
  const out: { id: string, name: string }[] = []
  try {
    for await (const m of anthropicClient(apiKey).models.list()) out.push({ id: m.id, name: m.display_name })
  } catch (err) {
    throw toHttpError(err)
  }
  return out
}

// Tool-use ids must match ^[a-zA-Z0-9_-]+$ — ids from history written by another
// provider (or none at all) get a synthesized one.
const ID_RE = /^[\w-]{1,64}$/
let idSeq = 0
const toolId = (id?: string) => (id && ID_RE.test(id) ? id : `toolu_${Date.now().toString(36)}${(idSeq++).toString(36)}`)

/**
 * Ollama-shaped history → Messages API params. Tool results are paired with the
 * preceding assistant's tool_use ids by order; consecutive results share one user
 * turn. Orphans left by the 40-message history cap or an interrupted loop are
 * dropped / closed so the API never sees an unmatched tool_use or tool_result.
 */
export function toAnthropic(messages: OllamaMessage[]) {
  const system = messages.filter(m => m.role === 'system').map(m => m.content).join('\n\n')
  const out: Anthropic.Beta.BetaMessageParam[] = []
  let pending: string[] = []

  const closePending = () => {
    if (!pending.length) return
    pushResults(pending.map(id => ({ type: 'tool_result', tool_use_id: id, content: 'Interrompido.', is_error: true })))
    pending = []
  }
  const pushResults = (blocks: Anthropic.Beta.BetaToolResultBlockParam[]) => {
    const last = out[out.length - 1]
    if (last?.role === 'user' && Array.isArray(last.content) && last.content.every(b => b.type === 'tool_result')) {
      (last.content as Anthropic.Beta.BetaContentBlockParam[]).push(...blocks)
    } else {
      out.push({ role: 'user', content: blocks })
    }
  }

  for (const m of messages) {
    if (m.role === 'system') continue
    if (m.role === 'tool') {
      const id = pending.shift()
      if (id) pushResults([{ type: 'tool_result', tool_use_id: id, content: m.content || '{}' }])
      continue
    }
    closePending()
    if (m.role === 'user') {
      out.push({ role: 'user', content: m.content })
      continue
    }
    // assistant — the first turn must be a user one.
    if (!out.length) continue
    if (m.raw) {
      // Same-request turn: replay the model's own blocks untouched (keeps thinking valid).
      out.push({ role: 'assistant', content: m.raw as Anthropic.Beta.BetaContentBlockParam[] })
      pending = (m.raw as Anthropic.Beta.BetaContentBlock[]).filter(b => b.type === 'tool_use').map(b => (b as Anthropic.Beta.BetaToolUseBlock).id)
      continue
    }
    const blocks: Anthropic.Beta.BetaContentBlockParam[] = []
    if (m.content) blocks.push({ type: 'text', text: m.content })
    for (const tc of m.tool_calls || []) {
      const id = toolId(tc.id)
      blocks.push({ type: 'tool_use', id, name: tc.function.name, input: tc.function.arguments || {} })
      pending.push(id)
    }
    if (blocks.length) out.push({ role: 'assistant', content: blocks })
  }
  closePending()
  return { system, messages: out }
}

function toTools(tools: OllamaTool[]): Anthropic.Beta.BetaTool[] {
  return tools.map(t => ({
    name: t.function.name,
    description: t.function.description,
    input_schema: t.function.parameters,
    eager_input_streaming: true,
  }))
}

function toHttpError(err: unknown) {
  if (err instanceof Anthropic.AuthenticationError) return createError({ statusCode: 400, statusMessage: 'API key da Anthropic inválida.' })
  if (err instanceof Anthropic.PermissionDeniedError) return createError({ statusCode: 400, statusMessage: 'A API key não tem acesso a este recurso.' })
  if (err instanceof Anthropic.NotFoundError) return createError({ statusCode: 400, statusMessage: 'Modelo Anthropic não encontrado.' })
  if (err instanceof Anthropic.RateLimitError) return createError({ statusCode: 429, statusMessage: 'Limite de pedidos da Anthropic atingido. Tenta daqui a pouco.' })
  if (err instanceof Anthropic.APIError) return createError({ statusCode: 502, statusMessage: `Anthropic indisponível (${err.status ?? '—'}). ${err.message.slice(0, 200)}` })
  if (err instanceof Anthropic.APIConnectionError) return createError({ statusCode: 502, statusMessage: 'Sem ligação à Anthropic.' })
  return err
}

function checkStop(msg: Anthropic.Beta.BetaMessage) {
  if (msg.stop_reason === 'refusal') {
    throw createError({ statusCode: 502, statusMessage: 'O modelo recusou responder a este pedido.' })
  }
  // A cut-off turn may carry a truncated tool input — never run it.
  if (msg.stop_reason === 'max_tokens' && msg.content.some(b => b.type === 'tool_use')) {
    throw createError({ statusCode: 502, statusMessage: 'Resposta do modelo cortada a meio. Tenta de novo.' })
  }
}

/** One assistant turn with tools, streaming text via onToken. */
export async function anthropicChat(
  cfg: { anthropicKey: string, anthropicModel: string },
  messages: OllamaMessage[],
  tools: OllamaTool[],
  onToken: (t: string) => void,
  opts: { signal?: AbortSignal } = {},
): Promise<{ content: string, toolCalls: OllamaToolCall[], raw: unknown[] }> {
  const { system, messages: msgs } = toAnthropic(messages)
  let final: Anthropic.Beta.BetaMessage
  try {
    const stream = anthropicClient(cfg.anthropicKey).beta.messages.stream({
      model: cfg.anthropicModel,
      max_tokens: 16000,
      system,
      messages: msgs,
      tools: toTools(tools),
      betas: [FALLBACK_BETA],
      fallbacks: 'default',
    }, { signal: opts.signal })
    stream.on('text', onToken)
    final = await stream.finalMessage()
  } catch (err) {
    throw toHttpError(err)
  }
  checkStop(final)

  const content = final.content.filter(b => b.type === 'text').map(b => (b as Anthropic.Beta.BetaTextBlock).text).join('')
  const toolCalls: OllamaToolCall[] = final.content
    .filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === 'tool_use')
    .map(b => ({
      id: b.id,
      // Eager input streaming skips server-side coercion; only pass a plain object on.
      function: { name: b.name, arguments: b.input && typeof b.input === 'object' && !Array.isArray(b.input) ? b.input as Record<string, any> : {} },
    }))
  return { content, toolCalls, raw: final.content }
}

/** Single non-streaming completion (no tools). */
export async function anthropicComplete(
  cfg: { anthropicKey: string, anthropicModel: string },
  messages: OllamaMessage[],
  opts: { signal?: AbortSignal } = {},
): Promise<string> {
  const { system, messages: msgs } = toAnthropic(messages)
  let res: Anthropic.Beta.BetaMessage
  try {
    res = await anthropicClient(cfg.anthropicKey).beta.messages.create({
      model: cfg.anthropicModel,
      // Room for (always-on) thinking on newer models before the short answer.
      max_tokens: 8000,
      system,
      messages: msgs,
      betas: [FALLBACK_BETA],
      fallbacks: 'default',
    }, { signal: opts.signal })
  } catch (err) {
    throw toHttpError(err)
  }
  checkStop(res)
  return res.content.filter(b => b.type === 'text').map(b => (b as Anthropic.Beta.BetaTextBlock).text).join('')
}
