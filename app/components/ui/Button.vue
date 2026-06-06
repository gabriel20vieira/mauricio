<script setup lang="ts">
const props = withDefaults(defineProps<{
  variant?: 'primary' | 'outline' | 'ghost' | 'subtle' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  icon?: string
  iconRight?: string
  full?: boolean
  type?: 'button' | 'submit'
}>(), { variant: 'primary', size: 'md', full: false, type: 'button' })

const h = ref(false)

const base = computed(() => ({
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
  border: '1px solid transparent', borderRadius: 'var(--radius-sm)', fontWeight: 540,
  transition: 'all 0.16s ease', whiteSpace: 'nowrap', width: props.full ? '100%' : 'auto',
  fontSize: props.size === 'sm' ? '13px' : props.size === 'lg' ? '15.5px' : '14px',
  padding: props.size === 'sm' ? '6px 11px' : props.size === 'lg' ? '11px 20px' : '8px 15px',
}))
const variants: Record<string, Record<string, string>> = {
  primary: { background: 'var(--accent)', color: 'var(--accent-ink)', borderColor: 'var(--accent)' },
  outline: { background: 'var(--surface)', color: 'var(--ink)', borderColor: 'var(--border-2)' },
  ghost: { background: 'transparent', color: 'var(--ink-2)' },
  subtle: { background: 'var(--surface-2)', color: 'var(--ink)' },
  danger: { background: 'transparent', color: 'var(--neg)', borderColor: 'var(--border-2)' },
}
const hov: Record<string, Record<string, string>> = {
  primary: { filter: 'brightness(1.06)', transform: 'translateY(-1px)' },
  outline: { borderColor: 'var(--faint)', background: 'var(--surface-2)' },
  ghost: { background: 'var(--surface-2)', color: 'var(--ink)' },
  subtle: { background: 'var(--border)' },
  danger: { background: 'var(--neg)', color: 'white', borderColor: 'var(--neg)' },
}
const style = computed(() => ({ ...base.value, ...variants[props.variant], ...(h.value ? hov[props.variant] : {}) }))
const iconSize = computed(() => props.size === 'sm' ? 15 : 17)
</script>

<template>
  <button :type="type" :style="style" @mouseenter="h = true" @mouseleave="h = false">
    <UiIcon v-if="icon" :name="icon" :size="iconSize" />
    <slot />
    <UiIcon v-if="iconRight" :name="iconRight" :size="iconSize" />
  </button>
</template>
