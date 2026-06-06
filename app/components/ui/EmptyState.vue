<script setup lang="ts">
withDefaults(defineProps<{ icon?: string; title?: string; sub?: string }>(), { icon: 'receipt' })
</script>

<template>
  <div style="text-align: center; padding: 48px 20px; color: var(--muted)">
    <div style="width: 52px; height: 52px; border-radius: 14px; background: var(--surface-2); display: grid; place-items: center; margin: 0 auto 14px; color: var(--faint)">
      <UiIcon :name="icon" :size="24" />
    </div>
    <div style="font-weight: 600; color: var(--ink-2); margin-bottom: 4px">{{ title }}</div>
    <div v-if="sub" style="font-size: 13.5px">{{ sub }}</div>
  </div>
</template>
