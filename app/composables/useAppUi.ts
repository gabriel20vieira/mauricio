import type { Expense } from './useStore'

export function useAppUi() {
  const navOpen = useState<boolean>('nav-open', () => false)
  const expenseModal = useState<{ open: boolean; editing: Expense | null }>('expense-modal', () => ({ open: false, editing: null }))

  function openNewExpense() { expenseModal.value = { open: true, editing: null } }
  function openEditExpense(e: Expense) { expenseModal.value = { open: true, editing: e } }
  function closeExpense() { expenseModal.value = { open: false, editing: null } }

  return { navOpen, expenseModal, openNewExpense, openEditExpense, closeExpense }
}
