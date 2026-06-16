<script setup lang="ts">
import { catColor, catSoft, firstName } from '~~/shared/config'
import type { Expense } from '~/composables/useStore'

const props = defineProps<{ expense: Expense }>()
const store = useStore()
const cats = useCategories()
const { user } = useUserSession()
const { isDark } = useTweaks()
const { openEditExpense } = useAppUi()

const cat = computed(() => cats.byId.value[props.expense.cat])
const member = computed(() => store.memberById.value[props.expense.userId])
const canEdit = computed(() => user.value?.role === 'admin' || props.expense.userId === user.value?.id)
</script>

<template>
  <div class="exp-row" style="display: grid; grid-template-columns: 40px 1fr auto auto; align-items: center; gap: 14px; padding: 12px 4px; border-top: 1px solid var(--border); cursor: pointer"
    @click="openEditExpense(expense)">
    <div :style="{ width: '40px', height: '40px', borderRadius: '11px', display: 'grid', placeItems: 'center', background: catSoft(cat?.hue ?? 200, isDark), color: catColor(cat?.hue ?? 200, isDark) }">
      <UiIcon :name="cat?.id === 'casa' ? 'home' : cat?.id === 'transportes' ? 'card' : cat?.id === 'lazer' ? 'tag' : cat?.id === 'utilidades' ? 'bell' : 'receipt'" :size="18" />
    </div>

    <div style="min-width: 0">
      <div style="font-weight: 600; font-size: 14.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{{ expense.note || cats.catLabel(expense.cat) }}</div>
      <div style="display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--muted); margin-top: 2px">
        <UiCatDot v-if="cat" :cat="cat" :size="7" />{{ cats.catLabel(expense.cat) }}<template v-if="expense.sub"> · {{ cats.subLabel(expense.cat, expense.sub) }}</template> · {{ $d(new Date(expense.date + 'T00:00:00'), 'short') }}
      </div>
    </div>

    <div class="exp-row-who" style="display: flex; align-items: center; gap: 8px; color: var(--ink-2)">
      <UiAvatar v-if="member" :member="member" :size="26" />
      <span class="hide-sm" style="font-size: 13px">{{ member ? firstName(member.name) : '—' }}</span>
    </div>

    <div style="display: flex; align-items: center; gap: 10px">
      <span class="tnum" style="font-weight: 600; font-size: 14.5px">{{ $n(expense.amountCents / 100, 'currency') }}</span>
      <UiIcon :name="canEdit ? 'pencil' : 'lock'" :size="15" :style="{ color: canEdit ? 'var(--muted)' : 'var(--faint)' }" />
    </div>
  </div>
</template>
