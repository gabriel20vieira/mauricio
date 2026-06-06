<script setup lang="ts">
import { catColor, type Category } from '~~/shared/config'
const props = withDefaults(defineProps<{ cat: Category; size?: number }>(), { size: 9 })
const { isDark } = useTweaks()
const style = computed(() => ({
  width: `${props.size}px`, height: `${props.size}px`, borderRadius: '50%',
  background: catColor(props.cat.hue, isDark.value), flexShrink: 0, display: 'inline-block',
}))
</script>

<template><span :style="style" /></template>
