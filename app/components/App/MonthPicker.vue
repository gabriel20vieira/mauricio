<script setup lang="ts">
import { MONTHS_PT_LONG, monthKey } from '~~/shared/config'

const store = useStore()
const selected = useMonth()

const months = computed(() => {
  const set = new Set(store.expenses.value.map(e => monthKey(e.date)))
  if (selected.value) set.add(selected.value)
  return [...set].sort().reverse()
})
function label(mk: string) {
  const [y, m] = mk.split('-').map(Number)
  return `${MONTHS_PT_LONG[m - 1]} ${y}`
}
</script>

<template>
  <div style="width: 180px">
    <UiSelect :model-value="selected" @update:model-value="selected = $event">
      <option v-for="mk in months" :key="mk" :value="mk">{{ label(mk) }}</option>
    </UiSelect>
  </div>
</template>
