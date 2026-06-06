<script setup lang="ts">
import { initials } from '~~/shared/config'

const props = withDefaults(defineProps<{
  member?: { name: string; hue: number } | null
  size?: number
  ring?: boolean
}>(), { size: 36, ring: false })

const { isDark } = useTweaks()
const style = computed(() => {
  const m = props.member
  if (!m) return {}
  const dark = isDark.value
  return {
    width: `${props.size}px`,
    height: `${props.size}px`,
    borderRadius: '50%',
    background: dark ? `oklch(0.40 0.07 ${m.hue})` : `oklch(0.90 0.05 ${m.hue})`,
    color: dark ? `oklch(0.93 0.06 ${m.hue})` : `oklch(0.42 0.10 ${m.hue})`,
    display: 'grid',
    placeItems: 'center',
    fontWeight: 600,
    flexShrink: 0,
    fontSize: `${props.size * 0.36}px`,
    letterSpacing: '0.02em',
    boxShadow: props.ring ? '0 0 0 2px var(--surface), 0 0 0 3.5px var(--border-2)' : 'none',
  }
})
</script>

<template>
  <div v-if="member" :style="style">{{ initials(member.name) }}</div>
</template>
