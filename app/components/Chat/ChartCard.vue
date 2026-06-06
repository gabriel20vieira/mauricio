<script setup lang="ts">
import type { ChartCard } from '~/composables/useChat'
import { euro0 } from '~~/shared/config'

const props = defineProps<{ card: ChartCard }>()
const { isDark } = useTweaks()

// Stable, sober palette (hues rotated through OKLCH).
const HUES = [165, 45, 245, 305, 205, 25, 345, 155]
function color(i: number) {
  return isDark.value ? `oklch(0.72 0.12 ${HUES[i % HUES.length]})` : `oklch(0.60 0.13 ${HUES[i % HUES.length]})`
}

const data = computed(() => props.card.chart.data || [])
const segments = computed(() => data.value.map((d, i) => ({ value: d.value, color: d.color || color(i), label: d.label })))
const bars = computed(() => data.value.map((d, i) => ({ label: d.label, value: d.value, color: d.color || color(i) })))
const total = computed(() => data.value.reduce((a, d) => a + d.value, 0))

// line chart geometry
const W = 440, H = 160, PAD = 28
const line = computed(() => {
  const d = data.value
  if (d.length < 2) return { pts: '', dots: [] as { x: number, y: number }[] }
  const max = Math.max(...d.map(p => p.value), 1)
  const stepX = (W - PAD * 2) / (d.length - 1)
  const pts = d.map((p, i) => {
    const x = PAD + i * stepX
    const y = H - PAD - (p.value / max) * (H - PAD * 2)
    return { x, y }
  })
  return { pts: pts.map(p => `${p.x},${p.y}`).join(' '), dots: pts }
})
</script>

<template>
  <UiCard :style="{ marginTop: '8px', maxWidth: '520px' }" :pad="18">
    <div style="font-size: 14px; font-weight: 600; margin-bottom: 12px">{{ card.chart.title }}</div>

    <!-- Donut -->
    <div v-if="card.chart.type === 'donut'" style="display: flex; align-items: center; gap: 20px; flex-wrap: wrap">
      <UiDonut :segments="segments" :size="150" :stroke="20">
        <template #center>
          <div>
            <div style="font-size: 11px; color: var(--muted)">Total</div>
            <div class="tnum" style="font-size: 16px; font-weight: 700">{{ euro0(total) }}</div>
          </div>
        </template>
      </UiDonut>
      <div style="display: flex; flex-direction: column; gap: 7px; flex: 1; min-width: 140px">
        <div v-for="(s, i) in segments" :key="i" style="display: flex; align-items: center; gap: 8px; font-size: 13px">
          <span :style="{ width: '9px', height: '9px', borderRadius: '50%', background: s.color, flexShrink: 0 }" />
          <span style="flex: 1">{{ s.label }}</span>
          <span class="tnum" style="font-weight: 600">{{ euro0(s.value) }}</span>
        </div>
      </div>
    </div>

    <!-- Bar -->
    <UiBarChart v-else-if="card.chart.type === 'bar'" :data="bars" :height="160" />

    <!-- Line -->
    <svg v-else :viewBox="`0 0 ${W} ${H}`" :width="'100%'" style="max-width: 520px">
      <polyline :points="line.pts" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
      <circle v-for="(p, i) in line.dots" :key="i" :cx="p.x" :cy="p.y" r="3.5" fill="var(--accent)" />
      <text v-for="(d, i) in data" :key="'t' + i" :x="PAD + i * ((W - PAD * 2) / Math.max(1, data.length - 1))" :y="H - 6"
        text-anchor="middle" style="font-size: 10px; fill: var(--muted)">{{ d.label }}</text>
    </svg>
  </UiCard>
</template>
