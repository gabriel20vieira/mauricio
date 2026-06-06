<script setup lang="ts">
import { euro0 } from '~~/shared/config'
interface Datum { label: string; value: number; color?: string }
const props = withDefaults(defineProps<{
  data: Datum[]
  height?: number
  fmt?: (n: number) => string
}>(), { height: 150 })
const format = computed(() => props.fmt || euro0)
const max = computed(() => Math.max(...props.data.map(d => d.value), 1))
</script>

<template>
  <div :style="{ display: 'flex', alignItems: 'flex-end', gap: '10px', height: `${height}px`, paddingTop: '18px' }">
    <div v-for="(d, i) in data" :key="i"
      style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px; height: 100%; justify-content: flex-end">
      <div class="tnum" style="font-size: 11.5px; font-weight: 600; color: var(--ink-2)">{{ format(d.value) }}</div>
      <div :title="format(d.value)" :style="{ width: '100%', maxWidth: '46px', height: `${(d.value / max) * 100}%`, minHeight: '4px', background: d.color || 'var(--accent)', borderRadius: '6px 6px 3px 3px' }" />
      <div style="font-size: 12px; color: var(--muted); font-weight: 500">{{ d.label }}</div>
    </div>
  </div>
</template>
