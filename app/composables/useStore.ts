export interface Member {
  id: string
  name: string
  email: string
  role: 'admin' | 'user'
  hue: number
  active: boolean
  createdAt: number
}
export interface Expense {
  id: string
  date: string
  amountCents: number
  cat: string
  sub: string
  note: string
  method: string
  userId: string
  createdAt: number
}

export interface ExpenseInput {
  date: string
  amount: number
  cat: string
  sub: string
  note: string
  method: string
  who?: string
}

export function useStore() {
  const expenses = useState<Expense[]>('expenses', () => [])
  const members = useState<Member[]>('members', () => [])
  const loaded = useState<boolean>('store-loaded', () => false)

  async function refresh() {
    const [ex, me] = await Promise.all([
      $fetch<Expense[]>('/api/expenses'),
      $fetch<Member[]>('/api/users'),
    ])
    expenses.value = ex
    members.value = me
    loaded.value = true
  }

  async function ensure() {
    if (!loaded.value) await refresh()
  }

  const memberById = computed<Record<string, Member>>(() =>
    Object.fromEntries(members.value.map(m => [m.id, m])))
  // Active members only — for pickers / current household roster. Inactive members
  // are kept for historical expense attribution but excluded from new assignments.
  const activeMembers = computed<Member[]>(() => members.value.filter(m => m.active))

  async function addExpense(input: ExpenseInput) {
    await $fetch('/api/expenses', { method: 'POST', body: input })
    await refresh()
  }
  async function updateExpense(id: string, input: Partial<ExpenseInput>) {
    await $fetch(`/api/expenses/${id}`, { method: 'PATCH', body: input })
    await refresh()
  }
  async function deleteExpense(id: string) {
    await $fetch(`/api/expenses/${id}`, { method: 'DELETE' })
    await refresh()
  }

  async function addMember(body: { name: string; email: string; password: string; role: 'admin' | 'user' }) {
    await $fetch('/api/users', { method: 'POST', body })
    await refresh()
  }
  async function updateMember(id: string, body: { name?: string; role?: 'admin' | 'user'; password?: string }) {
    await $fetch(`/api/users/${id}`, { method: 'PATCH', body })
    await refresh()
  }
  async function deleteMember(id: string) {
    await $fetch(`/api/users/${id}`, { method: 'DELETE' })
    await refresh()
  }

  return {
    expenses, members, loaded, memberById, activeMembers,
    refresh, ensure,
    addExpense, updateExpense, deleteExpense,
    addMember, updateMember, deleteMember,
  }
}

// ---- analytics helpers (pure) ----
import { monthKey } from '~~/shared/config'

export function listMonths(expenses: Expense[]): string[] {
  const set = new Set(expenses.map(e => monthKey(e.date)))
  return [...set].sort().reverse()
}
export function expensesForMonth(expenses: Expense[], mk: string): Expense[] {
  return expenses.filter(e => monthKey(e.date) === mk)
}
export function sumCents(rows: Expense[]): number {
  return rows.reduce((a, e) => a + e.amountCents, 0)
}
