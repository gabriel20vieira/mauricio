<script setup lang="ts">
import { firstName } from '~~/shared/config'
import type { Income } from '~/composables/useStore'

const props = defineProps<{ income: Income }>()
const store = useStore()
const { user } = useUserSession()
const { openEditIncome } = useAppUi()

const member = computed(() => store.memberById.value[props.income.userId])
const canEdit = computed(() => user.value?.role === 'admin' || props.income.userId === user.value?.id)
</script>

<template>
  <div class="exp-row" style="display: grid; grid-template-columns: 40px 1fr auto auto; align-items: center; gap: 14px; padding: 12px 4px; border-top: 1px solid var(--border); cursor: pointer"
    @click="openEditIncome(income)">
    <div style="width: 40px; height: 40px; border-radius: 11px; display: grid; place-items: center; background: color-mix(in oklab, var(--pos) 14%, transparent); color: var(--pos)">
      <UiIcon name="trend" :size="18" />
    </div>

    <div style="min-width: 0">
      <div style="font-weight: 600; font-size: 14.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{{ income.source || $t('income.defaultSource') }}</div>
      <div style="display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--muted); margin-top: 2px">
        <template v-if="income.note">{{ income.note }} · </template>{{ $d(new Date(income.date + 'T00:00:00'), 'short') }}
      </div>
    </div>

    <div class="exp-row-who" style="display: flex; align-items: center; gap: 8px; color: var(--ink-2)">
      <UiAvatar v-if="member" :member="member" :size="26" />
      <span class="hide-sm" style="font-size: 13px">{{ member ? firstName(member.name) : '—' }}</span>
    </div>

    <div style="display: flex; align-items: center; gap: 10px">
      <span class="tnum" style="font-weight: 600; font-size: 14.5px; color: var(--pos)">+{{ $n(income.amountCents / 100, 'currency') }}</span>
      <UiIcon :name="canEdit ? 'pencil' : 'lock'" :size="15" :style="{ color: canEdit ? 'var(--muted)' : 'var(--faint)' }" />
    </div>
  </div>
</template>
