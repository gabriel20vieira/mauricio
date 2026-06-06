export interface ConfirmCard {
  kind: 'confirm'
  action: 'add' | 'update' | 'delete'
  payload: Record<string, any>
  summary: string
}
export interface ChartCard {
  kind: 'chart'
  chart: {
    type: 'line' | 'area' | 'column' | 'bar' | 'stacked' | 'donut' | 'radar' | 'table'
    title: string
    categories: string[]
    series: { name: string, data: number[] }[]
    measureLabel: string
  }
}
export type Card = ConfirmCard | ChartCard

export interface ConversationMeta {
  id: string
  title: string
  createdAt: number
  updatedAt: number
}

export interface ChatHandlers {
  onStart?: (conversationId: string) => void
  onToken?: (text: string) => void
  onTool?: (name: string, status: 'running' | 'done', label?: string) => void
  onCard?: (card: Card) => void
  onDone?: (data: { conversationId: string, content: string, cards: Card[] }) => void
  onError?: (message: string) => void
}

/** POST a message and consume the SSE stream, dispatching to handlers. */
export async function streamChat(
  body: { conversationId?: string, message: string },
  handlers: ChatHandlers,
  signal?: AbortSignal,
) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok || !res.body) {
    handlers.onError?.(`Erro ${res.status} ao contactar o assistente.`)
    return
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    let idx: number
    while ((idx = buf.indexOf('\n\n')) >= 0) {
      const chunk = buf.slice(0, idx).trim()
      buf = buf.slice(idx + 2)
      if (!chunk.startsWith('data:')) continue
      let ev: any
      try { ev = JSON.parse(chunk.slice(5).trim()) } catch { continue }
      switch (ev.type) {
        case 'start': handlers.onStart?.(ev.conversationId); break
        case 'token': handlers.onToken?.(ev.text); break
        case 'tool': handlers.onTool?.(ev.name, ev.status, ev.label); break
        case 'card': handlers.onCard?.(ev.card); break
        case 'done': handlers.onDone?.(ev); break
        case 'error': handlers.onError?.(ev.message); break
      }
    }
  }
}
