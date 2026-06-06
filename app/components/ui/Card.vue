<script setup lang="ts">
const props = withDefaults(defineProps<{
  pad?: number | string
  hover?: boolean
}>(), { pad: 20, hover: false })

const h = ref(false)
const style = computed(() => ({
  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
  padding: typeof props.pad === 'number' ? `calc(${props.pad}px * var(--pad, 1))` : props.pad,
  boxShadow: h.value ? 'var(--shadow)' : 'var(--shadow-sm)',
  transition: 'box-shadow 0.18s ease, transform 0.18s ease',
  transform: h.value ? 'translateY(-2px)' : 'none',
}))
</script>

<template>
  <div :style="style"
    @mouseenter="hover && (h = true)" @mouseleave="hover && (h = false)">
    <slot />
  </div>
</template>
