// Real-time client: keeps the shared store in sync with other users via websockets.
// Connects after login (using a one-time ticket), applies fine-grained change events,
// and reconnects with backoff. Only shared data (expenses, categories, members) flows
// here — personal/settings changes are not broadcast.
export default defineNuxtPlugin(() => {
  const { loggedIn } = useUserSession()
  const store = useStore()

  let ws: WebSocket | null = null
  let closedByUs = false
  let backoff = 1000

  function wsUrl(ticket: string): string {
    const base = useRuntimeConfig().public.wsUrl as string
    if (base) return `${base}${base.includes('?') ? '&' : '?'}ticket=${ticket}`
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    return `${proto}://${window.location.hostname}:5003/?ticket=${ticket}`
  }

  function scheduleReconnect() {
    if (closedByUs) return
    setTimeout(connect, backoff)
    backoff = Math.min(backoff * 2, 15_000)
  }

  async function connect() {
    if (!loggedIn.value || ws) return
    closedByUs = false
    try {
      const { ticket } = await $fetch<{ ticket: string }>('/api/realtime/ticket')
      const socket = new WebSocket(wsUrl(ticket))
      ws = socket
      socket.onopen = () => { backoff = 1000 }
      socket.onmessage = (ev) => {
        let m: any
        try { m = JSON.parse(ev.data) } catch { return }
        if (m.type !== 'change') return
        if (m.resource === 'expense') {
          m.action === 'delete' ? store.applyExpenseRemove(m.id) : store.applyExpense(m.item)
        } else if (m.resource === 'income') {
          m.action === 'delete' ? store.applyIncomeRemove(m.id) : store.applyIncome(m.item)
        } else if (m.resource === 'member') {
          store.applyMember(m.item)
        } else if (m.resource === 'category') {
          store.applyCategory(m.item)
        } else if (m.resource === 'bulk') {
          store.refresh().catch(() => {}) // bulk import — refetch everything
        }
      }
      socket.onclose = () => { if (ws === socket) ws = null; scheduleReconnect() }
      socket.onerror = () => { try { socket.close() } catch { /* ignore */ } }
    } catch {
      ws = null
      scheduleReconnect()
    }
  }

  function disconnect() {
    closedByUs = true
    try { ws?.close() } catch { /* ignore */ }
    ws = null
  }

  watch(loggedIn, v => (v ? connect() : disconnect()), { immediate: true })
})
