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

export interface CatNames { en: string; pt: string; es: string }
export interface SubcategoryT { id: string; sort: number; active: boolean; names: CatNames }
export interface CategoryT { id: string; hue: number; sort: number; active: boolean; names: CatNames; subs: SubcategoryT[] }

export function useStore() {
  const expenses = useState<Expense[]>('expenses', () => [])
  const members = useState<Member[]>('members', () => [])
  const categories = useState<CategoryT[]>('categories', () => [])
  const loaded = useState<boolean>('store-loaded', () => false)

  async function refresh() {
    const [ex, me, cats] = await Promise.all([
      $fetch<Expense[]>('/api/expenses'),
      $fetch<Member[]>('/api/users'),
      $fetch<CategoryT[]>('/api/categories'),
    ])
    expenses.value = ex
    members.value = me
    categories.value = cats
    loaded.value = true
  }
  async function refreshCategories() {
    categories.value = await $fetch<CategoryT[]>('/api/categories')
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
  async function setMemberActive(id: string, active: boolean) {
    await $fetch(`/api/users/${id}`, { method: 'PATCH', body: { active } })
    await refresh()
  }

  // ---- categories / subcategories ----
  async function addCategory(body: { names: CatNames; hue: number }) {
    await $fetch('/api/categories', { method: 'POST', body }); await refreshCategories()
  }
  async function updateCategory(id: string, body: { names?: Partial<CatNames>; hue?: number; active?: boolean }) {
    await $fetch(`/api/categories/${id}`, { method: 'PATCH', body }); await refreshCategories()
  }
  async function hideCategory(id: string) {
    await $fetch(`/api/categories/${id}`, { method: 'DELETE' }); await refreshCategories()
  }
  async function addSubcategory(body: { categoryId: string; names: CatNames }) {
    await $fetch('/api/subcategories', { method: 'POST', body }); await refreshCategories()
  }
  async function updateSubcategory(id: string, body: { names?: Partial<CatNames>; active?: boolean }) {
    await $fetch(`/api/subcategories/${id}`, { method: 'PATCH', body }); await refreshCategories()
  }
  async function hideSubcategory(id: string) {
    await $fetch(`/api/subcategories/${id}`, { method: 'DELETE' }); await refreshCategories()
  }

  // ---- sessions ----
  function fetchSessions(all = false) {
    return $fetch<SessionInfo[]>('/api/sessions', { query: all ? { all: 1 } : {} })
  }
  function revokeSession(id: string) {
    return $fetch(`/api/sessions/${id}`, { method: 'DELETE' })
  }

  return {
    expenses, members, categories, loaded, memberById, activeMembers,
    refresh, refreshCategories, ensure,
    addExpense, updateExpense, deleteExpense,
    addMember, updateMember, deleteMember, setMemberActive,
    addCategory, updateCategory, hideCategory,
    addSubcategory, updateSubcategory, hideSubcategory,
    fetchSessions, revokeSession,
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
