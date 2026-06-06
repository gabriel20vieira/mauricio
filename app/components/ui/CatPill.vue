<script setup lang="ts">
import { catSoft, type Category } from '~~/shared/config'
const props = defineProps<{ cat: Category; sub?: string }>()
const { isDark } = useTweaks()
const style = computed(() => ({
  display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '3px 10px 3px 8px',
  borderRadius: '99px', background: catSoft(props.cat.hue, isDark.value), fontSize: '12.5px', fontWeight: 500,
  color: isDark.value ? `oklch(0.9 0.05 ${props.cat.hue})` : `oklch(0.38 0.09 ${props.cat.hue})`,
}))
</script>

<template>
  <span :style="style">
    <UiCatDot :cat="cat" :size="7" />{{ cat.label }}<span v-if="sub" style="opacity: 0.6">· {{ sub }}</span>
  </span>
</template>
