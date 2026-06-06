<script setup lang="ts">
const props = withDefaults(defineProps<{
  name: string
  size?: number
  label?: string
  active?: boolean
}>(), { size: 18, active: false })

const h = ref(false)
const style = computed(() => ({
  display: 'grid', placeItems: 'center', width: '38px', height: '38px', borderRadius: 'var(--radius-sm)',
  border: '1px solid', borderColor: props.active ? 'var(--border-2)' : 'transparent',
  background: h.value || props.active ? 'var(--surface-2)' : 'transparent',
  color: props.active ? 'var(--ink)' : 'var(--ink-2)', transition: 'all 0.15s ease',
}))
</script>

<template>
  <button :aria-label="label" :style="style" @mouseenter="h = true" @mouseleave="h = false">
    <UiIcon :name="name" :size="size" />
  </button>
</template>
