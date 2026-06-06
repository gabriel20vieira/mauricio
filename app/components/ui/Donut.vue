<script setup lang="ts">
interface Seg { value: number; color: string; label?: string }
const props = withDefaults(defineProps<{
  segments: Seg[]
  total?: number
  size?: number
  stroke?: number
}>(), { size: 168, stroke: 22 })

const r = computed(() => (props.size - props.stroke) / 2)
const c = computed(() => 2 * Math.PI * r.value)
const sum = computed(() => props.total || props.segments.reduce((a, s) => a + s.value, 0) || 1)
const arcs = computed(() => {
  let acc = 0
  return props.segments.map((s) => {
    const frac = s.value / sum.value
    const dash = frac * c.value
    const off = acc * c.value
    acc += frac
    return { ...s, dash, gap: c.value - dash, off: -off }
  })
})
</script>

<template>
  <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`">
    <circle :cx="size / 2" :cy="size / 2" :r="r" fill="none" stroke="var(--surface-2)" :stroke-width="stroke" />
    <circle v-for="(a, i) in arcs" :key="i" :cx="size / 2" :cy="size / 2" :r="r" fill="none"
      :stroke="a.color" :stroke-width="stroke" :stroke-dasharray="`${a.dash} ${a.gap}`" :stroke-dashoffset="a.off"
      :transform="`rotate(-90 ${size / 2} ${size / 2})`" stroke-linecap="butt" style="transition: all 0.5s ease" />
    <foreignObject v-if="$slots.center" x="0" y="0" :width="size" :height="size">
      <div style="width: 100%; height: 100%; display: grid; place-items: center; text-align: center">
        <slot name="center" />
      </div>
    </foreignObject>
  </svg>
</template>
