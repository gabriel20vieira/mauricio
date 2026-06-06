import { monthKey } from '~~/shared/config'
import type { Expense } from './useStore'

export function useMonth() {
  return useState<string>('selected-month', () => '')
}

// Ensure the selected month is valid given current data; default to the latest.
export function syncMonth(selected: Ref<string>, expenses: Expense[]) {
  const months = [...new Set(expenses.map(e => monthKey(e.date)))].sort().reverse()
  if (!selected.value || !months.includes(selected.value)) {
    selected.value = months[0] || monthKey(new Date().toISOString().slice(0, 10))
  }
}
