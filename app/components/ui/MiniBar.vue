<script setup lang="ts">
const props = defineProps<{ value: number; max: number; color?: string }>()
const w = computed(() => Math.min(100, (props.value / (props.max || 1)) * 100))
</script>

<template>
  <div style="height: 7px; border-radius: 99px; background: var(--surface-2); overflow: hidden">
    <div :style="{ height: '100%', width: `${w}%`, background: color || 'var(--accent)', borderRadius: '99px' }" />
  </div>
</template>
