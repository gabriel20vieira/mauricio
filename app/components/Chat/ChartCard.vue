<script setup lang="ts">
import type { ChartCard } from '~/composables/useChat'

const props = defineProps<{ card: ChartCard }>()
const { n } = useI18n()
const { isDark } = useTweaks()

const HUES = [165, 45, 245, 305, 205, 25, 345, 155, 95, 275]
function color(i: number) {
  const h = HUES[i % HUES.length]
  return isDark.value ? `oklch(0.72 0.12 ${h})` : `oklch(0.60 0.13 ${h})`
}

const type = computed(() => props.card.chart.type)
const cats = computed(() => props.card.chart.categories || [])
const series = computed(() => props.card.chart.series || [])
const multi = computed(() => series.value.length > 1)
const isEuro = computed(() => props.card.chart.measureLabel === '€')
function fmt(v: number) { return isEuro.value ? n(v, 'currency0') : String(Math.round(v * 100) / 100) }

const maxVal = computed(() => Math.max(1, ...series.value.flatMap(s => s.data)))
const stackTotals = computed(() => cats.value.map((_, i) => series.value.reduce((a, s) => a + (s.data[i] || 0), 0)))
const stackMax = computed(() => Math.max(1, ...stackTotals.value))

// donut uses the first series across categories
const donutSegs = computed(() => cats.value.map((label, i) => ({ value: series.value[0]?.data[i] || 0, color: color(i), label })))
const donutTotal = computed(() => donutSegs.value.reduce((a, s) => a + s.value, 0))

// ---- line / area geometry ----
const LW = 540, LH = 210, PL = 44, PR = 12, PT = 12, PB = 28
const plotW = LW - PL - PR
const plotH = LH - PT - PB
function xAt(i: number) { return cats.value.length <= 1 ? PL + plotW / 2 : PL + (i * plotW) / (cats.value.length - 1) }
function yAt(v: number) { return PT + plotH - (v / maxVal.value) * plotH }
const linePaths = computed(() => series.value.map((s, si) => ({
  name: s.name, color: color(si),
  pts: s.data.map((v, i) => `${xAt(i)},${yAt(v)}`).join(' '),
  area: `${PL},${PT + plotH} ${s.data.map((v, i) => `${xAt(i)},${yAt(v)}`).join(' ')} ${PL + plotW},${PT + plotH}`,
  dots: s.data.map((v, i) => ({ x: xAt(i), y: yAt(v) })),
})))

// ---- radar geometry ----
const RS = 300, RC = RS / 2, RR = RS / 2 - 46
function radarPt(i: number, v: number) {
  const n = Math.max(cats.value.length, 1)
  const ang = (i / n) * 2 * Math.PI - Math.PI / 2
  const r = (v / maxVal.value) * RR
  return { x: RC + r * Math.cos(ang), y: RC + r * Math.sin(ang), ax: RC + RR * Math.cos(ang), ay: RC + RR * Math.sin(ang) }
}
const radarPolys = computed(() => series.value.map((s, si) => ({
  name: s.name, color: color(si),
  pts: s.data.map((v, i) => { const p = radarPt(i, v); return `${p.x},${p.y}` }).join(' '),
})))
const radarAxes = computed(() => cats.value.map((label, i) => { const p = radarPt(i, maxVal.value); return { label, ...p } }))

const legend = computed(() => multi.value
  ? series.value.map((s, i) => ({ name: s.name, color: color(i) }))
  : (type.value === 'donut' ? cats.value.map((c, i) => ({ name: c, color: color(i) })) : []))
</script>

<template>
  <UiCard :style="{ marginTop: '8px', maxWidth: '560px' }" :pad="18">
    <div style="font-size: 14px; font-weight: 600; margin-bottom: 12px">{{ card.chart.title }}</div>

    <div v-if="!cats.length" style="font-size: 13px; color: var(--muted)">{{ $t('reports.noData') }}</div>

    <!-- DONUT -->
    <div v-else-if="type === 'donut'" style="display: flex; align-items: center; gap: 20px; flex-wrap: wrap">
      <UiDonut :segments="donutSegs" :size="150" :stroke="20">
        <template #center>
          <div>
            <div style="font-size: 11px; color: var(--muted)">Total</div>
            <div class="tnum" style="font-size: 15px; font-weight: 700">{{ fmt(donutTotal) }}</div>
          </div>
        </template>
      </UiDonut>
      <div style="display: flex; flex-direction: column; gap: 7px; flex: 1; min-width: 150px">
        <div v-for="(s, i) in donutSegs" :key="i" style="display: flex; align-items: center; gap: 8px; font-size: 13px">
          <span :style="{ width: '9px', height: '9px', borderRadius: '50%', background: s.color, flexShrink: 0 }" />
          <span style="flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">{{ s.label }}</span>
          <span class="tnum" style="font-weight: 600">{{ fmt(s.value) }}</span>
        </div>
      </div>
    </div>

    <!-- LINE / AREA -->
    <svg v-else-if="type === 'line' || type === 'area'" :viewBox="`0 0 ${LW} ${LH}`" width="100%" :style="{ maxWidth: LW + 'px' }">
      <line :x1="PL" :y1="PT + plotH" :x2="PL + plotW" :y2="PT + plotH" stroke="var(--border-2)" stroke-width="1" />
      <template v-for="(s, si) in linePaths" :key="si">
        <polygon v-if="type === 'area'" :points="s.area" :fill="s.color" fill-opacity="0.14" />
        <polyline :points="s.pts" fill="none" :stroke="s.color" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
        <circle v-for="(d, i) in s.dots" :key="i" :cx="d.x" :cy="d.y" r="3" :fill="s.color" />
      </template>
      <text v-for="(c, i) in cats" :key="'x' + i" :x="xAt(i)" :y="LH - 8" text-anchor="middle" style="font-size: 10px; fill: var(--muted)">{{ c }}</text>
    </svg>

    <!-- COLUMN (vertical, grouped) -->
    <div v-else-if="type === 'column'" :style="{ display: 'flex', alignItems: 'flex-end', gap: '10px', height: '200px', paddingTop: '18px' }">
      <div v-for="(c, i) in cats" :key="i" style="flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 6px; height: 100%; justify-content: flex-end">
        <div style="display: flex; align-items: flex-end; gap: 3px; width: 100%; height: 100%; justify-content: center">
          <div v-for="(s, si) in series" :key="si" :title="`${s.name}: ${fmt(s.data[i] || 0)}`"
            :style="{ flex: 1, maxWidth: '34px', height: ((s.data[i] || 0) / maxVal * 100) + '%', minHeight: '3px', background: color(si), borderRadius: '5px 5px 2px 2px' }" />
        </div>
        <div v-if="!multi" class="tnum" style="font-size: 11px; font-weight: 600; color: var(--ink-2)">{{ fmt(series[0]?.data[i] || 0) }}</div>
        <div style="font-size: 11px; color: var(--muted); text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%">{{ c }}</div>
      </div>
    </div>

    <!-- STACKED (vertical) -->
    <div v-else-if="type === 'stacked'" :style="{ display: 'flex', alignItems: 'flex-end', gap: '10px', height: '210px', paddingTop: '10px' }">
      <div v-for="(c, i) in cats" :key="i" style="flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 6px; height: 100%; justify-content: flex-end">
        <div :style="{ width: '100%', maxWidth: '46px', height: (stackTotals[i] / stackMax * 100) + '%', display: 'flex', flexDirection: 'column', borderRadius: '5px 5px 2px 2px', overflow: 'hidden' }">
          <div v-for="(s, si) in series" :key="si" :title="`${s.name}: ${fmt(s.data[i] || 0)}`"
            :style="{ flexGrow: s.data[i] || 0, background: color(si), minHeight: (s.data[i] ? '2px' : '0') }" />
        </div>
        <div style="font-size: 11px; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%">{{ c }}</div>
      </div>
    </div>

    <!-- BAR (horizontal, grouped) -->
    <div v-else-if="type === 'bar'" style="display: flex; flex-direction: column; gap: 12px">
      <div v-for="(c, i) in cats" :key="i" style="display: grid; grid-template-columns: 96px 1fr; gap: 10px; align-items: center">
        <div style="font-size: 12.5px; color: var(--ink-2); text-align: right; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">{{ c }}</div>
        <div style="display: flex; flex-direction: column; gap: 3px">
          <div v-for="(s, si) in series" :key="si" style="display: flex; align-items: center; gap: 6px">
            <div :style="{ height: '14px', width: ((s.data[i] || 0) / maxVal * 100) + '%', minWidth: '2px', background: color(si), borderRadius: '3px' }" />
            <span class="tnum" style="font-size: 11px; color: var(--muted)">{{ fmt(s.data[i] || 0) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- RADAR -->
    <div v-else-if="type === 'radar'" style="display: flex; justify-content: center">
      <svg :viewBox="`0 0 ${RS} ${RS}`" width="100%" :style="{ maxWidth: '320px' }">
        <polygon v-for="ring in [0.33, 0.66, 1]" :key="ring"
          :points="radarAxes.map((_, i) => { const p = radarPt(i, maxVal * ring); return `${p.x},${p.y}` }).join(' ')"
          fill="none" stroke="var(--border)" stroke-width="1" />
        <line v-for="(a, i) in radarAxes" :key="'a' + i" :x1="RC" :y1="RC" :x2="a.ax" :y2="a.ay" stroke="var(--border)" stroke-width="1" />
        <polygon v-for="(p, si) in radarPolys" :key="si" :points="p.pts" :fill="p.color" fill-opacity="0.15" :stroke="p.color" stroke-width="2" />
        <text v-for="(a, i) in radarAxes" :key="'t' + i" :x="a.ax" :y="a.ay" :text-anchor="a.ax > RC + 4 ? 'start' : a.ax < RC - 4 ? 'end' : 'middle'"
          :dy="a.ay > RC ? 12 : -4" style="font-size: 10px; fill: var(--muted)">{{ a.label }}</text>
      </svg>
    </div>

    <!-- TABLE -->
    <div v-else-if="type === 'table'" style="overflow-x: auto">
      <table style="width: 100%; border-collapse: collapse; font-size: 13px">
        <thead>
          <tr style="border-bottom: 1px solid var(--border)">
            <th style="text-align: left; padding: 6px 8px; color: var(--muted); font-weight: 600"> </th>
            <th v-for="(s, si) in series" :key="si" style="text-align: right; padding: 6px 8px; color: var(--ink-2); font-weight: 600">{{ s.name }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(c, i) in cats" :key="i" style="border-bottom: 1px solid var(--border)">
            <td style="padding: 6px 8px; color: var(--ink)">{{ c }}</td>
            <td v-for="(s, si) in series" :key="si" class="tnum" style="text-align: right; padding: 6px 8px; color: var(--ink); font-weight: 500">{{ fmt(s.data[i] || 0) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Legend (multi-series, or donut handled inline) -->
    <div v-if="legend.length && type !== 'donut'" style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 12px">
      <div v-for="(l, i) in legend" :key="i" style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--ink-2)">
        <span :style="{ width: '10px', height: '10px', borderRadius: '3px', background: l.color }" />{{ l.name }}
      </div>
    </div>
  </UiCard>
</template>
