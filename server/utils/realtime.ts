import { randomUUID } from 'node:crypto'
import { WebSocketServer, WebSocket } from 'ws'
import type { Expense, Income } from '../db/schema'
import type { CategoryDTO } from './categories'

// Real-time layer: a dedicated WebSocket server (port 5003) that pushes fine-grained
// data changes to every logged-in client. Auth is via one-time tickets minted by an
// authenticated HTTP endpoint (avoids parsing the sealed session cookie cross-port).
//
// In production behind TLS, put a reverse proxy in front (e.g. wss://host/ws → :5003)
// and point clients at it with NUXT_PUBLIC_WS_URL.

const WS_PORT = Number(process.env.WS_PORT || 5003)
const TICKET_TTL = 30_000

interface Client { ws: WebSocket, userId: string, alive: boolean }
interface Ticket { userId: string, exp: number }

// Fine-grained change events sent to clients. Soft-deletes (hidden category /
// deactivated member) are sent as `upsert` with active=false.
export type RealtimeEvent =
  | { type: 'ready' }
  | { type: 'change', resource: 'expense', action: 'upsert', item: Expense }
  | { type: 'change', resource: 'expense', action: 'delete', id: string }
  | { type: 'change', resource: 'income', action: 'upsert', item: Income }
  | { type: 'change', resource: 'income', action: 'delete', id: string }
  | { type: 'change', resource: 'member', action: 'upsert', item: Record<string, any> }
  | { type: 'change', resource: 'category', action: 'upsert', item: CategoryDTO }

// Singleton kept on globalThis so nuxt dev HMR doesn't spin up a second server.
const g = globalThis as any
const state: { wss: WebSocketServer | null, clients: Set<Client>, tickets: Map<string, Ticket> } =
  g.__mauricioRealtime ||= { wss: null, clients: new Set(), tickets: new Map() }

export function startRealtime() {
  if (state.wss) return
  let wss: WebSocketServer
  try {
    wss = new WebSocketServer({ port: WS_PORT, host: '0.0.0.0' })
  } catch {
    return // another instance already owns the port (dev HMR)
  }
  state.wss = wss

  wss.on('error', (e: any) => {
    if (e?.code === 'EADDRINUSE') { state.wss = null; return }
    console.error('[realtime] server error', e)
  })

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url || '/', 'http://localhost')
    const ticket = url.searchParams.get('ticket') || ''
    const t = state.tickets.get(ticket)
    if (!t || t.exp < Date.now()) { ws.close(4401, 'unauthorized'); return }
    state.tickets.delete(ticket) // one-time use

    const client: Client = { ws, userId: t.userId, alive: true }
    state.clients.add(client)
    ws.on('pong', () => { client.alive = true })
    ws.on('close', () => state.clients.delete(client))
    ws.on('error', () => state.clients.delete(client))
    ws.send(JSON.stringify({ type: 'ready' } satisfies RealtimeEvent))
  })

  // Heartbeat: drop dead sockets; prune expired tickets.
  const iv = setInterval(() => {
    for (const c of state.clients) {
      if (!c.alive) { try { c.ws.terminate() } catch {} state.clients.delete(c); continue }
      c.alive = false
      try { c.ws.ping() } catch { state.clients.delete(c) }
    }
    const now = Date.now()
    for (const [k, v] of state.tickets) if (v.exp < now) state.tickets.delete(k)
  }, TICKET_TTL)
  if (typeof iv.unref === 'function') iv.unref()
}

// Mint a short-lived one-time ticket for a user (called from an authenticated route).
export function issueTicket(userId: string): string {
  const ticket = randomUUID()
  state.tickets.set(ticket, { userId, exp: Date.now() + TICKET_TTL })
  return ticket
}

function send(event: RealtimeEvent) {
  const msg = JSON.stringify(event)
  for (const c of state.clients) {
    if (c.ws.readyState === WebSocket.OPEN) { try { c.ws.send(msg) } catch {} }
  }
}

export function broadcastExpenseUpsert(item: Expense) { send({ type: 'change', resource: 'expense', action: 'upsert', item }) }
export function broadcastExpenseDelete(id: string) { send({ type: 'change', resource: 'expense', action: 'delete', id }) }
export function broadcastIncomeUpsert(item: Income) { send({ type: 'change', resource: 'income', action: 'upsert', item }) }
export function broadcastIncomeDelete(id: string) { send({ type: 'change', resource: 'income', action: 'delete', id }) }
export function broadcastMemberUpsert(item: Record<string, any>) { send({ type: 'change', resource: 'member', action: 'upsert', item }) }
export function broadcastCategoryUpsert(item: CategoryDTO) { send({ type: 'change', resource: 'category', action: 'upsert', item }) }
