<script setup lang="ts">
const props = withDefaults(defineProps<{ tone?: 'muted' | 'accent' | 'admin' }>(), { tone: 'muted' })
const tones: Record<string, { bg: string; fg: string }> = {
  muted: { bg: 'var(--surface-2)', fg: 'var(--ink-2)' },
  accent: { bg: 'var(--accent-soft)', fg: 'var(--accent)' },
  admin: { bg: 'var(--accent-soft)', fg: 'var(--accent)' },
}
const t = computed(() => tones[props.tone] || tones.muted)
</script>

<template>
  <span :style="{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '99px', background: t.bg, color: t.fg, letterSpacing: '0.02em' }">
    <slot />
  </span>
</template>
