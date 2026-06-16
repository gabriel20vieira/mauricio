// Thin client for Ollama's /api/chat with tool-calling + streaming.

export interface OllamaToolCall {
  id?: string
  function: { name: string, arguments: Record<string, any> }
}
export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_calls?: OllamaToolCall[]
  tool_name?: string
}
export interface OllamaTool {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: { type: 'object', properties: Record<string, any>, required?: string[] }
  }
}

interface ChatResult {
  content: string
  toolCalls: OllamaToolCall[]
}

/**
 * One assistant turn. Streams content tokens via onToken; returns the full
 * content plus any tool calls the model emitted.
 */
export async function ollamaChat(
  messages: OllamaMessage[],
  tools: OllamaTool[],
  onToken: (t: string) => void,
  opts: { signal?: AbortSignal } = {},
): Promise<ChatResult> {
  const cfg = getAssistantConfig()
  const res = await fetch(`${cfg.baseUrl}/api/chat`, {
    method: 'POST',
    headers: ollamaHeaders(cfg),
    body: JSON.stringify({ model: cfg.model, stream: true, messages, tools }),
    signal: opts.signal,
  })
  if (!res.ok || !res.body) {
    const txt = await res.text().catch(() => '')
    throw createError({ statusCode: 502, statusMessage: `Ollama indisponível (${res.status}). ${txt.slice(0, 200)}` })
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  let content = ''
  const toolCalls: OllamaToolCall[] = []

  // NDJSON: one JSON object per line.
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    let nl: number
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim()
      buf = buf.slice(nl + 1)
      if (!line) continue
      let obj: any
      try { obj = JSON.parse(line) } catch { continue }
      if (obj.error) throw createError({ statusCode: 502, statusMessage: `Ollama: ${obj.error}` })
      const msg = obj.message
      if (msg?.content) { content += msg.content; onToken(msg.content) }
      if (msg?.tool_calls?.length) {
        for (const tc of msg.tool_calls) {
          const args = typeof tc.function.arguments === 'string'
            ? safeJson(tc.function.arguments)
            : (tc.function.arguments || {})
          toolCalls.push({ id: tc.id, function: { name: tc.function.name, arguments: args } })
        }
      }
    }
  }
  return { content, toolCalls }
}

function safeJson(s: string): Record<string, any> {
  try { return JSON.parse(s) } catch { return {} }
}

// Headers for an Ollama request — Bearer token only when the cloud toggle is on.
function ollamaHeaders(cfg: { useCloud: boolean, token: string }): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (cfg.useCloud && cfg.token) h.Authorization = `Bearer ${cfg.token}`
  return h
}

/** Single non-streaming completion (no tools). Used for short tasks like titling. */
export async function ollamaComplete(messages: OllamaMessage[], opts: { signal?: AbortSignal } = {}): Promise<string> {
  const cfg = getAssistantConfig()
  const res = await fetch(`${cfg.baseUrl}/api/chat`, {
    method: 'POST',
    headers: ollamaHeaders(cfg),
    body: JSON.stringify({ model: cfg.model, stream: false, messages }),
    signal: opts.signal,
  })
  if (!res.ok) throw new Error(`Ollama ${res.status}`)
  const data = await res.json() as { message?: { content?: string } }
  return data.message?.content || ''
}
