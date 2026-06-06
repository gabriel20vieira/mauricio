// AI tool definitions + executors for the chat assistant.
// READ tools query the DB. PROPOSE / CHART tools never mutate — they return a
// descriptor card the client renders (with a confirm button for writes).

import { desc } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { db, schema } from './db'
import type { Expense, User } from '../db/schema'
import { CATEGORIES, CAT_BY_ID, monthKey, euro, MONTHS_PT_LONG } from '../../shared/config'
import type { OllamaTool } from './ollama'

// ---- card descriptors sent to the client ----
export interface ConfirmCard {
  kind: 'confirm'
  action: 'add' | 'update' | 'delete'
  payload: Record<string, any>
  summary: string
}
export interface ChartCard {
  kind: 'chart'
  chart: { type: 'donut' | 'bar' | 'line', title: string, data: { label: string, value: number, color?: string }[] }
}
export type Card = ConfirmCard | ChartCard

export interface ToolOutcome {
  result: any // fed back to the model as the tool message content
  card?: Card // rendered by the client
  label: string // short human label, e.g. "Procurou gastos"
}

// ---------------------------------------------------------------- definitions
const catIds = CATEGORIES.map(c => c.id)
export const TOOLS: OllamaTool[] = [
  fn('search_expenses', 'Procura gastos por filtros. Devolve lista de gastos.', {
    month: { type: 'string', description: 'Mês no formato yyyy-mm (ex. 2026-06)' },
    cat: { type: 'string', enum: catIds, description: 'ID da categoria' },
    sub: { type: 'string', description: 'Subcategoria (ex. Casa, Fora, Renda)' },
    who: { type: 'string', description: 'Nome ou ID do membro que pagou' },
    minAmount: { type: 'number', description: 'Valor mínimo em euros' },
    maxAmount: { type: 'number', description: 'Valor máximo em euros' },
    text: { type: 'string', description: 'Texto a procurar na nota do gasto' },
    limit: { type: 'number', description: 'Máximo de resultados (def. 30)' },
  }),
  fn('get_summary', 'Resumo de um mês: total, por categoria, por pessoa, vs mês anterior.', {
    month: { type: 'string', description: 'yyyy-mm; omite para o mês mais recente com dados' },
  }),
  fn('get_balance', 'Balanço de um mês: contribuição de cada pessoa vs quota média e transferências para equilibrar.', {
    month: { type: 'string', description: 'yyyy-mm; omite para o mês mais recente' },
  }),
  fn('list_members', 'Lista os membros da casa (id, nome, papel).', {}),
  fn('get_categories', 'Lista as categorias e subcategorias disponíveis.', {}),
  fn('monthly_totals', 'Total gasto por mês num intervalo. Útil para gráficos de evolução.', {
    fromMonth: { type: 'string', description: 'yyyy-mm inicial' },
    toMonth: { type: 'string', description: 'yyyy-mm final' },
  }),
  fn('propose_add_expense', 'Propõe adicionar um gasto. NÃO grava — mostra cartão de confirmação ao utilizador.', {
    date: { type: 'string', description: 'yyyy-mm-dd' },
    amount: { type: 'number', description: 'Valor em euros' },
    cat: { type: 'string', enum: catIds, description: 'ID da categoria' },
    sub: { type: 'string' },
    note: { type: 'string' },
    method: { type: 'string', description: 'Cartão, MB Way, Débito, Transferência, Dinheiro' },
    who: { type: 'string', description: 'Nome ou ID do membro (só admin pode pôr noutro)' },
  }, ['date', 'amount', 'cat']),
  fn('propose_update_expense', 'Propõe editar um gasto existente. NÃO grava — mostra cartão de confirmação.', {
    id: { type: 'string', description: 'ID do gasto' },
    date: { type: 'string' }, amount: { type: 'number' }, cat: { type: 'string', enum: catIds },
    sub: { type: 'string' }, note: { type: 'string' }, method: { type: 'string' },
  }, ['id']),
  fn('propose_delete_expense', 'Propõe eliminar um gasto. NUNCA elimina — mostra cartão para o utilizador confirmar.', {
    id: { type: 'string', description: 'ID do gasto' },
  }, ['id']),
  fn('render_chart', 'Mostra um gráfico ao utilizador a partir de dados que já obtiveste.', {
    type: { type: 'string', enum: ['donut', 'bar', 'line'] },
    title: { type: 'string' },
    data: {
      type: 'array',
      description: 'Pontos [{label, value}]',
      items: { type: 'object', properties: { label: { type: 'string' }, value: { type: 'number' } } },
    },
  }, ['type', 'data']),
]

function fn(name: string, description: string, props: Record<string, any>, required: string[] = []): OllamaTool {
  return { type: 'function', function: { name, description, parameters: { type: 'object', properties: props, required } } }
}

// ---------------------------------------------------------------- helpers
function loadMembers(): User[] {
  return db.select().from(schema.users).all()
}
function loadExpenses(): Expense[] {
  return db.select().from(schema.expenses).orderBy(desc(schema.expenses.date), desc(schema.expenses.createdAt)).all()
}
function resolveMember(members: User[], who?: string): User | undefined {
  if (!who) return undefined
  const w = who.trim().toLowerCase()
  return members.find(m => m.id === who)
    || members.find(m => m.name.toLowerCase() === w)
    || members.find(m => m.name.toLowerCase().split(' ')[0] === w)
    || members.find(m => m.name.toLowerCase().includes(w))
}
function latestMonth(expenses: Expense[]): string {
  const months = [...new Set(expenses.map(e => monthKey(e.date)))].sort()
  return months[months.length - 1] || monthKey(new Date().toISOString().slice(0, 10))
}
function monthLabel(mk: string): string {
  const [y, m] = mk.split('-').map(Number)
  return `${MONTHS_PT_LONG[(m || 1) - 1]} ${y}`
}
function expenseView(e: Expense, members: User[]) {
  const who = members.find(m => m.id === e.userId)
  return {
    id: e.id, date: e.date, amount: e.amountCents / 100, valor: euro(e.amountCents / 100),
    categoria: CAT_BY_ID[e.cat]?.label || e.cat, cat: e.cat, sub: e.sub,
    nota: e.note, metodo: e.method, quem: who?.name || '—', whoId: e.userId,
  }
}

// ---------------------------------------------------------------- executor
export async function runTool(name: string, args: Record<string, any>, user: User, _event: H3Event): Promise<ToolOutcome> {
  const members = loadMembers()
  const expenses = loadExpenses()

  switch (name) {
    case 'list_members':
      return { label: 'Listou membros', result: members.map(m => ({ id: m.id, nome: m.name, papel: m.role })) }

    case 'get_categories':
      return { label: 'Listou categorias', result: CATEGORIES.map(c => ({ id: c.id, label: c.label, subs: c.subs })) }

    case 'search_expenses': {
      const m = resolveMember(members, args.who)
      let rows = expenses
      if (args.month) rows = rows.filter(e => monthKey(e.date) === args.month)
      if (args.cat) rows = rows.filter(e => e.cat === args.cat)
      if (args.sub) rows = rows.filter(e => e.sub.toLowerCase() === String(args.sub).toLowerCase())
      if (m) rows = rows.filter(e => e.userId === m.id)
      if (args.minAmount != null) rows = rows.filter(e => e.amountCents >= args.minAmount * 100)
      if (args.maxAmount != null) rows = rows.filter(e => e.amountCents <= args.maxAmount * 100)
      if (args.text) rows = rows.filter(e => e.note.toLowerCase().includes(String(args.text).toLowerCase()))
      const limit = Math.min(args.limit || 30, 100)
      const totalCents = rows.reduce((a, e) => a + e.amountCents, 0)
      return {
        label: `Procurou gastos (${rows.length})`,
        result: { count: rows.length, total: euro(totalCents / 100), totalAmount: totalCents / 100, gastos: rows.slice(0, limit).map(e => expenseView(e, members)) },
      }
    }

    case 'get_summary': {
      const mk = args.month || latestMonth(expenses)
      const rows = expenses.filter(e => monthKey(e.date) === mk)
      const totalCents = rows.reduce((a, e) => a + e.amountCents, 0)
      const byCat: Record<string, number> = {}
      const byPerson: Record<string, number> = {}
      for (const e of rows) {
        byCat[e.cat] = (byCat[e.cat] || 0) + e.amountCents
        byPerson[e.userId] = (byPerson[e.userId] || 0) + e.amountCents
      }
      // previous month
      const [y, mm] = mk.split('-').map(Number)
      const prev = new Date(y, mm - 2, 1)
      const prevMk = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`
      const prevCents = expenses.filter(e => monthKey(e.date) === prevMk).reduce((a, e) => a + e.amountCents, 0)
      return {
        label: `Resumo de ${monthLabel(mk)}`,
        result: {
          mes: monthLabel(mk), month: mk, total: euro(totalCents / 100), totalAmount: totalCents / 100, movimentos: rows.length,
          mesAnterior: euro(prevCents / 100), variacaoPct: prevCents ? Math.round(((totalCents - prevCents) / prevCents) * 100) : null,
          porCategoria: Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([c, v]) => ({ categoria: CAT_BY_ID[c]?.label || c, cat: c, total: euro(v / 100), amount: v / 100 })),
          porPessoa: Object.entries(byPerson).sort((a, b) => b[1] - a[1]).map(([u, v]) => ({ pessoa: members.find(m => m.id === u)?.name || u, total: euro(v / 100), amount: v / 100 })),
        },
      }
    }

    case 'get_balance': {
      const mk = args.month || latestMonth(expenses)
      const rows = expenses.filter(e => monthKey(e.date) === mk)
      const totalCents = rows.reduce((a, e) => a + e.amountCents, 0)
      const contrib: Record<string, number> = Object.fromEntries(members.map(m => [m.id, 0]))
      for (const e of rows) contrib[e.userId] = (contrib[e.userId] || 0) + e.amountCents
      const n = members.length || 1
      const quota = totalCents / n
      const people = members.map(m => ({ id: m.id, nome: m.name, pago: contrib[m.id] || 0, saldo: (contrib[m.id] || 0) - quota }))
      // minimal transfers: debtors pay creditors
      const debtors = people.filter(p => p.saldo < -1).map(p => ({ ...p })).sort((a, b) => a.saldo - b.saldo)
      const creditors = people.filter(p => p.saldo > 1).map(p => ({ ...p })).sort((a, b) => b.saldo - a.saldo)
      const transfers: any[] = []
      let ci = 0
      for (const d of debtors) {
        let owe = -d.saldo
        while (owe > 1 && ci < creditors.length) {
          const c = creditors[ci]
          const pay = Math.min(owe, c.saldo)
          transfers.push({ de: d.nome, para: c.nome, valor: euro(pay / 100) })
          owe -= pay; c.saldo -= pay
          if (c.saldo <= 1) ci++
        }
      }
      return {
        label: `Balanço de ${monthLabel(mk)}`,
        result: {
          mes: monthLabel(mk), total: euro(totalCents / 100), quotaMedia: euro(quota / 100),
          pessoas: people.map(p => ({ nome: p.nome, contribuiu: euro(p.pago / 100), saldo: euro(p.saldo / 100), estado: p.saldo >= 0 ? 'acima da média' : 'abaixo da média' })),
          transferenciasSugeridas: transfers,
        },
      }
    }

    case 'monthly_totals': {
      const byMonth: Record<string, number> = {}
      for (const e of expenses) {
        const mk = monthKey(e.date)
        if (args.fromMonth && mk < args.fromMonth) continue
        if (args.toMonth && mk > args.toMonth) continue
        byMonth[mk] = (byMonth[mk] || 0) + e.amountCents
      }
      const data = Object.entries(byMonth).sort().map(([mk, v]) => ({ month: mk, label: monthLabel(mk), total: euro(v / 100), amount: v / 100 }))
      return { label: 'Totais mensais', result: { meses: data } }
    }

    case 'propose_add_expense': {
      const m = resolveMember(members, args.who)
      const cat = CAT_BY_ID[args.cat]
      const payload = {
        date: args.date, amount: Number(args.amount), cat: args.cat,
        sub: args.sub || '', note: args.note || '', method: args.method || '',
        who: m?.id, // server enforces: non-admin forced to self
      }
      const summary = `Adicionar gasto de ${euro(payload.amount)} em ${cat?.label || args.cat}${payload.sub ? ` · ${payload.sub}` : ''} (${args.date})${payload.note ? ` — ${payload.note}` : ''}${m ? ` · ${m.name}` : ''}`
      return { label: 'Propôs adicionar gasto', result: { proposto: true, aguardaConfirmacao: true, resumo: summary }, card: { kind: 'confirm', action: 'add', payload, summary } }
    }

    case 'propose_update_expense': {
      const target = expenses.find(e => e.id === args.id)
      if (!target) return { label: 'Gasto não encontrado', result: { erro: 'Gasto não encontrado com esse ID.' } }
      const payload: Record<string, any> = { id: args.id }
      for (const k of ['date', 'cat', 'sub', 'note', 'method'] as const) if (args[k] != null) payload[k] = args[k]
      if (args.amount != null) payload.amount = Number(args.amount)
      const summary = `Editar gasto ${euro(target.amountCents / 100)} (${target.date}) → ${Object.entries(payload).filter(([k]) => k !== 'id').map(([k, v]) => `${k}: ${v}`).join(', ') || 'sem alterações'}`
      return { label: 'Propôs editar gasto', result: { proposto: true, aguardaConfirmacao: true, resumo: summary }, card: { kind: 'confirm', action: 'update', payload, summary } }
    }

    case 'propose_delete_expense': {
      const target = expenses.find(e => e.id === args.id)
      if (!target) return { label: 'Gasto não encontrado', result: { erro: 'Gasto não encontrado com esse ID.' } }
      const v = expenseView(target, members)
      const summary = `Eliminar gasto de ${v.valor} em ${v.categoria} (${v.date})${v.nota ? ` — ${v.nota}` : ''} · ${v.quem}`
      return { label: 'Propôs eliminar gasto', result: { proposto: true, aguardaConfirmacao: true, resumo: summary }, card: { kind: 'confirm', action: 'delete', payload: { id: target.id }, summary } }
    }

    case 'render_chart': {
      const data = Array.isArray(args.data) ? args.data.map((d: any) => ({ label: String(d.label ?? ''), value: Number(d.value) || 0 })) : []
      return {
        label: 'Gerou gráfico',
        result: { renderizado: true, pontos: data.length },
        card: { kind: 'chart', chart: { type: ['donut', 'bar', 'line'].includes(args.type) ? args.type : 'bar', title: args.title || 'Gráfico', data } },
      }
    }

    default:
      return { label: `Tool desconhecida: ${name}`, result: { erro: `Tool '${name}' não existe.` } }
  }
}

// ---------------------------------------------------------------- system prompt
export function systemPrompt(user: User): string {
  const today = new Date().toISOString().slice(0, 10)
  const cats = CATEGORIES.map(c => `${c.id} (${c.label}${c.subs.length ? `: ${c.subs.join('/')}` : ''})`).join(', ')
  const members = loadMembers().map(m => `${m.name} [${m.id}]${m.role === 'admin' ? ' (admin)' : ''}`).join(', ')
  return [
    'És o assistente da app "Lar — contas de casa", que gere despesas domésticas de uma família. Respondes sempre em português de Portugal, de forma breve e útil.',
    `Hoje é ${today}. O ano corrente é ${today.slice(0, 4)}. Quando o utilizador disser um mês sem ano, assume o ano corrente.`,
    'Moeda: euro (€).',
    `Categorias válidas (usa SEMPRE o id): ${cats}.`,
    `Membros da casa: ${members}.`,
    `Estás a falar com ${user.name} (papel: ${user.role}).`,
    '',
    'Regras importantes:',
    '- Para obter dados usa as tools de leitura (search_expenses, get_summary, get_balance, monthly_totals, list_members, get_categories). Nunca inventes números — consulta sempre.',
    '- NÃO consegues gravar, editar nem eliminar diretamente. Para qualquer alteração usa propose_add_expense / propose_update_expense / propose_delete_expense: isto mostra um cartão de confirmação ao utilizador. Só depois de ele confirmar é que a ação acontece.',
    '- Nunca digas que gravaste/eliminaste algo. Diz que apresentaste a proposta e que aguarda confirmação.',
    '- Para mostrar um gráfico, obtém primeiro os dados com uma tool de leitura e depois chama render_chart.',
    '- Sê conciso. Mostra valores em euros.',
  ].join('\n')
}
