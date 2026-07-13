<script setup lang="ts">
import { catColor, catSoft, firstName } from '~~/shared/config'
import type { Movement, Expense, Income } from '~/composables/useStore'

// Unified row for a movement (expense or income). Branches internally so callers
// stay dumb — they just pass a Movement and click dispatches to the right modal.
const props = defineProps<{ movement: Movement }>()
const store = useStore()
const cats = useCategories()
const incomeCats = useIncomeCategories()
const { user } = useUserSession()
const { isDark } = useTweaks()
const { openEditExpense, openEditIncome } = useAppUi()
const { t } = useI18n()

const isIncome = computed(() => props.movement.kind === 'income')
const member = computed(() => store.memberById.value[props.movement.userId])
const canEdit = computed(() => user.value?.role === 'admin' || props.movement.userId === user.value?.id)

const expenseCat = computed(() => props.movement.kind === 'expense' ? cats.byId.value[(props.movement.ref as Expense).cat] : undefined)

// Swatch (icon tile) styling.
const tile = computed(() => {
  if (isIncome.value) {
    return { bg: 'color-mix(in oklab, var(--pos) 14%, transparent)', color: 'var(--pos)', icon: 'trend' }
  }
  const hue = expenseCat.value?.hue ?? 200
  const id = expenseCat.value?.id
  const icon = id === 'casa' ? 'home' : id === 'transportes' ? 'card' : id === 'lazer' ? 'tag' : id === 'utilidades' ? 'bell' : 'receipt'
  return { bg: catSoft(hue, isDark.value), color: catColor(hue, isDark.value), icon }
})

const title = computed(() => {
  if (isIncome.value) {
    const i = props.movement.ref as Income
    return i.incomeCat ? incomeCats.catLabel(i.incomeCat) : (i.source || t('income.defaultSource'))
  }
  const e = props.movement.ref as Expense
  return e.note || cats.catLabel(e.cat)
})

const subtitle = computed(() => {
  if (isIncome.value) {
    const i = props.movement.ref as Income
    return i.note || (i.incomeCat ? incomeCats.catLabel(i.incomeCat) : (i.source || ''))
  }
  const e = props.movement.ref as Expense
  return cats.catLabel(e.cat) + (e.sub ? ` · ${cats.subLabel(e.cat, e.sub)}` : '')
})

function onClick() {
  if (isIncome.value) openEditIncome(props.movement.ref as Income)
  else openEditExpense(props.movement.ref as Expense)
}
</script>

<template>
  <div class="exp-row" style="display: grid; grid-template-columns: 40px 1fr auto auto; align-items: center; gap: 14px; padding: 12px 4px; border-top: 1px solid var(--border); cursor: pointer"
    @click="onClick">
    <div :style="{ width: '40px', height: '40px', borderRadius: '11px', display: 'grid', placeItems: 'center', background: tile.bg, color: tile.color }">
      <UiIcon :name="tile.icon" :size="18" />
    </div>

    <div style="min-width: 0">
      <div style="font-weight: 600; font-size: 14.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{{ title }}</div>
      <div style="display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--muted); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">
        <UiCatDot v-if="expenseCat" :cat="expenseCat" :size="7" />{{ subtitle }} · {{ $d(new Date(movement.date + 'T00:00:00'), 'short') }}
      </div>
    </div>

    <div class="exp-row-who" style="display: flex; align-items: center; gap: 8px; color: var(--ink-2)">
      <UiAvatar v-if="member" :member="member" :size="26" />
      <span class="hide-sm" style="font-size: 13px">{{ member ? firstName(member.name) : '—' }}</span>
    </div>

    <div style="display: flex; align-items: center; gap: 10px">
      <span class="tnum" style="font-weight: 600; font-size: 14.5px" :style="{ color: isIncome ? 'var(--pos)' : 'var(--ink)' }">
        {{ isIncome ? '+' : '' }}{{ $n(movement.amountCents / 100, 'currency') }}
      </span>
      <UiIcon :name="canEdit ? 'pencil' : 'lock'" :size="15" :style="{ color: canEdit ? 'var(--muted)' : 'var(--faint)' }" />
    </div>
  </div>
</template>
