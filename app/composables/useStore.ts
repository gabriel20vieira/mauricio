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

export interface Income {
  id: string
  date: string
  amountCents: number
  incomeCat: string // income category id (matches the API/DB field name)
  source: string // legacy free-text (historical rows)
  note: string
  userId: string
  createdAt: number
}

export interface IncomeInput {
  date: string
  amount: number
  cat: string // income category id
  note: string
  who?: string
}

// A unified movement: an expense (negative) or an income (positive). `ref` is the
// original row so callers can open the right edit modal.
export interface Movement {
  kind: 'expense' | 'income'
  id: string
  date: string
  amountCents: number // always positive magnitude
  signedCents: number // negative for expense, positive for income
  note: string
  userId: string
  createdAt: number
  ref: Expense | Income
}

export interface CatNames { en: string; pt: string; es: string }
export interface SubcategoryT { id: string; sort: number; active: boolean; names: CatNames; description: string }
export interface CategoryT { id: string; hue: number; sort: number; active: boolean; names: CatNames; subs: SubcategoryT[]; description: string }
// Income categories are flat (no subcategories).
export interface IncomeCategoryT { id: string; hue: number; sort: number; active: boolean; names: CatNames; description: string }

export function useStore() {
  const expenses = useState<Expense[]>('expenses', () => [])
  const incomes = useState<Income[]>('incomes', () => [])
  const members = useState<Member[]>('members', () => [])
  const categories = useState<CategoryT[]>('categories', () => [])
  const incomeCategories = useState<IncomeCategoryT[]>('income-categories', () => [])
  const loaded = useState<boolean>('store-loaded', () => false)

  async function refresh() {
    const [ex, inc, me, cats, incCats] = await Promise.all([
      $fetch<Expense[]>('/api/expenses'),
      $fetch<Income[]>('/api/incomes'),
      $fetch<Member[]>('/api/users'),
      $fetch<CategoryT[]>('/api/categories'),
      $fetch<IncomeCategoryT[]>('/api/income-categories'),
    ])
    expenses.value = ex
    incomes.value = inc
    members.value = me
    categories.value = cats
    incomeCategories.value = incCats
    loaded.value = true
  }
  async function refreshCategories() {
    categories.value = await $fetch<CategoryT[]>('/api/categories')
  }
  async function refreshIncomeCategories() {
    incomeCategories.value = await $fetch<IncomeCategoryT[]>('/api/income-categories')
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

  async function addIncome(input: IncomeInput) {
    await $fetch('/api/incomes', { method: 'POST', body: input })
    await refresh()
  }
  async function updateIncome(id: string, input: Partial<IncomeInput>) {
    await $fetch(`/api/incomes/${id}`, { method: 'PATCH', body: input })
    await refresh()
  }
  async function deleteIncome(id: string) {
    await $fetch(`/api/incomes/${id}`, { method: 'DELETE' })
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
  async function setMemberActive(id: string, active: boolean) {
    await $fetch(`/api/users/${id}`, { method: 'PATCH', body: { active } })
    await refresh()
  }

  // ---- categories / subcategories ----
  async function addCategory(body: { names: CatNames; hue: number; description?: string }) {
    await $fetch('/api/categories', { method: 'POST', body }); await refreshCategories()
  }
  async function updateCategory(id: string, body: { names?: Partial<CatNames>; hue?: number; active?: boolean; description?: string }) {
    await $fetch(`/api/categories/${id}`, { method: 'PATCH', body }); await refreshCategories()
  }
  async function hideCategory(id: string) {
    await $fetch(`/api/categories/${id}`, { method: 'DELETE' }); await refreshCategories()
  }
  async function addSubcategory(body: { categoryId: string; names: CatNames; description?: string }) {
    await $fetch('/api/subcategories', { method: 'POST', body }); await refreshCategories()
  }
  async function updateSubcategory(id: string, body: { names?: Partial<CatNames>; active?: boolean; description?: string }) {
    await $fetch(`/api/subcategories/${id}`, { method: 'PATCH', body }); await refreshCategories()
  }
  async function hideSubcategory(id: string) {
    await $fetch(`/api/subcategories/${id}`, { method: 'DELETE' }); await refreshCategories()
  }

  // ---- income categories (flat) ----
  async function addIncomeCategory(body: { names: CatNames; hue: number; description?: string }) {
    await $fetch('/api/income-categories', { method: 'POST', body }); await refreshIncomeCategories()
  }
  async function updateIncomeCategory(id: string, body: { names?: Partial<CatNames>; hue?: number; active?: boolean; description?: string }) {
    await $fetch(`/api/income-categories/${id}`, { method: 'PATCH', body }); await refreshIncomeCategories()
  }
  async function hideIncomeCategory(id: string) {
    await $fetch(`/api/income-categories/${id}`, { method: 'DELETE' }); await refreshIncomeCategories()
  }

  // ---- realtime apply (from websocket events; no refetch) ----
  function applyExpense(e: Expense) {
    const has = expenses.value.some(x => x.id === e.id)
    expenses.value = has ? expenses.value.map(x => x.id === e.id ? e : x) : [e, ...expenses.value]
  }
  function applyExpenseRemove(id: string) {
    expenses.value = expenses.value.filter(x => x.id !== id)
  }
  function applyIncome(i: Income) {
    const has = incomes.value.some(x => x.id === i.id)
    incomes.value = has ? incomes.value.map(x => x.id === i.id ? i : x) : [i, ...incomes.value]
  }
  function applyIncomeRemove(id: string) {
    incomes.value = incomes.value.filter(x => x.id !== id)
  }
  function applyMember(u: Member) {
    const has = members.value.some(m => m.id === u.id)
    members.value = has ? members.value.map(m => m.id === u.id ? u : m) : [...members.value, u]
  }
  function applyCategory(c: CategoryT) {
    const has = categories.value.some(x => x.id === c.id)
    categories.value = has ? categories.value.map(x => x.id === c.id ? c : x) : [...categories.value, c]
  }
  function applyIncomeCategory(c: IncomeCategoryT) {
    const has = incomeCategories.value.some(x => x.id === c.id)
    incomeCategories.value = has ? incomeCategories.value.map(x => x.id === c.id ? c : x) : [...incomeCategories.value, c]
  }

  // Unified movement list (expenses + incomes), newest first.
  const movements = computed<Movement[]>(() => {
    const ex: Movement[] = expenses.value.map(e => ({
      kind: 'expense', id: e.id, date: e.date, amountCents: e.amountCents, signedCents: -e.amountCents,
      note: e.note, userId: e.userId, createdAt: e.createdAt, ref: e,
    }))
    const inc: Movement[] = incomes.value.map(i => ({
      kind: 'income', id: i.id, date: i.date, amountCents: i.amountCents, signedCents: i.amountCents,
      note: i.note, userId: i.userId, createdAt: i.createdAt, ref: i,
    }))
    return [...ex, ...inc].sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt)
  })

  // ---- sessions ----
  function fetchSessions(all = false) {
    return $fetch<SessionInfo[]>('/api/sessions', { query: all ? { all: 1 } : {} })
  }
  function revokeSession(id: string) {
    return $fetch(`/api/sessions/${id}`, { method: 'DELETE' })
  }

  return {
    expenses, incomes, members, categories, incomeCategories, loaded, memberById, activeMembers, movements,
    refresh, refreshCategories, refreshIncomeCategories, ensure,
    addExpense, updateExpense, deleteExpense,
    addIncome, updateIncome, deleteIncome,
    addMember, updateMember, deleteMember, setMemberActive,
    addCategory, updateCategory, hideCategory,
    addSubcategory, updateSubcategory, hideSubcategory,
    addIncomeCategory, updateIncomeCategory, hideIncomeCategory,
    fetchSessions, revokeSession,
    applyExpense, applyExpenseRemove, applyIncome, applyIncomeRemove, applyMember, applyCategory, applyIncomeCategory,
  }
}

export interface SessionInfo {
  id: string
  userId: string
  userName?: string
  userAgent: string
  ip: string
  createdAt: number
  lastSeenAt: number
  current: boolean
}

// ---- analytics helpers (pure) ----
import { monthKey } from '~~/shared/config'

// Structural {date, amountCents} so these work for expenses, incomes and movements.
export function listMonths(rows: { date: string }[]): string[] {
  const set = new Set(rows.map(e => monthKey(e.date)))
  return [...set].sort().reverse()
}
export function expensesForMonth<T extends { date: string }>(rows: T[], mk: string): T[] {
  return rows.filter(e => monthKey(e.date) === mk)
}
export function sumCents(rows: { amountCents: number }[]): number {
  return rows.reduce((a, e) => a + e.amountCents, 0)
}
