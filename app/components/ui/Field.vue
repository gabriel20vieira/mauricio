<script setup lang="ts">
defineProps<{ label?: string; hint?: string }>()
</script>

<template>
  <label style="display: block">
    <div v-if="label" style="font-size: 12.5px; font-weight: 540; color: var(--ink-2); margin-bottom: 6px">{{ label }}</div>
    <slot />
    <div v-if="hint" style="font-size: 11.5px; color: var(--muted); margin-top: 5px">{{ hint }}</div>
  </label>
</template>
