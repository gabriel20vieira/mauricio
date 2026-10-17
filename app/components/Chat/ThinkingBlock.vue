<script setup lang="ts">
// Collapsible "thinking" block for one run of reasoning + tool steps in an assistant
// reply. Live: open, animated header with a running timer. Done: collapses to
// "Thought for N s", click to reopen the summary.
interface Item {
  type: 'thinking' | 'tool'
  text?: string // thinking
  label?: string // tool
  done?: boolean // tool
  start?: number // ms since the request started
  end?: number
}
const props = defineProps<{
  items: Item[]
  active: boolean
  since?: number // live only: wall-clock ms when this block started
}>()
const { t } = useI18n()

// null = follow the default (open while thinking, closed once done).
const userOpen = ref<boolean | null>(null)
const open = computed(() => !!props.items.length && (userOpen.value ?? props.active))
watch(() => props.active, (a) => { if (!a) userOpen.value = null })

const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | undefined
watch(() => props.active, (a) => {
  clearInterval(timer)
  if (a) timer = setInterval(() => { now.value = Date.now() }, 250)
}, { immediate: true })
onBeforeUnmount(() => clearInterval(timer))

const seconds = computed<number | null>(() => {
  if (props.active) return props.since ? Math.max(0, Math.floor((now.value - props.since) / 1000)) : null
  const starts = props.items.map(i => i.start).filter((v): v is number => typeof v === 'number')
  const ends = props.items.map(i => i.end).filter((v): v is number => typeof v === 'number')
  if (!starts.length || !ends.length) return null // stored before timings existed
  return Math.max(1, Math.round((Math.max(...ends) - Math.min(...starts)) / 1000))
})
const label = computed(() => props.active
  ? t('assistant.thinkingNow')
  : seconds.value !== null ? t('assistant.thoughtFor', { s: seconds.value }) : t('assistant.steps', { n: props.items.length }))

// Keep the newest reasoning in view while it streams.
const body = ref<HTMLElement | null>(null)
watch(() => props.items.map(i => (i.text?.length || 0) + (i.done ? 1 : 0)).join(), () => {
  if (props.active) nextTick(() => { if (body.value) body.value.scrollTop = body.value.scrollHeight })
})
</script>

<template>
  <div class="think">
    <button type="button" class="think-hd" :aria-expanded="open" :disabled="!items.length" @click="userOpen = !open">
      <span v-if="active" class="orb" aria-hidden="true"><i /><i /><i /></span>
      <UiIcon v-else name="sparkles" :size="14" class="think-ico" />
      <span v-if="active" class="wave" :aria-label="label">
        <span v-for="(c, i) in label" :key="i" aria-hidden="true" :style="{ animationDelay: `${i * 0.07}s` }">{{ c === ' ' ? ' ' : c }}</span>
      </span>
      <span v-else>{{ label }}</span>
      <span v-if="active && seconds !== null" class="think-time">· {{ seconds }} s</span>
      <UiIcon v-if="items.length" name="chevRight" :size="13" class="chev" :class="{ open }" />
    </button>
    <div class="think-wrap" :class="{ open }">
      <div class="think-inner">
        <div ref="body" class="think-body">
          <template v-for="(it, i) in items" :key="i">
            <p v-if="it.type === 'thinking'" class="think-text">{{ it.text }}</p>
            <div v-else class="think-step">
              <span class="chip">
                <span v-if="!it.done" class="spin" aria-hidden="true" />
                <UiIcon v-else name="check" :size="12" style="color: var(--pos)" />
                {{ it.label || $t('assistant.working') }}
              </span>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.think-hd {
  display: inline-flex; align-items: center; gap: 7px;
  background: none; border: none; padding: 2px 0; cursor: pointer;
  font: inherit; font-size: 13px; color: var(--muted);
}
.think-hd:disabled { cursor: default; }
.think-hd:not(:disabled):hover { color: var(--ink-2); }
.think-ico { color: var(--accent); }
.think-time { color: var(--faint); font-variant-numeric: tabular-nums; }
.chev { transition: transform 0.25s ease; }
.chev.open { transform: rotate(90deg); }

/* Three dots breathing in sequence. */
.orb { display: inline-flex; gap: 3px; }
.orb i { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); animation: orb 1s ease-in-out infinite; }
.orb i:nth-child(2) { animation-delay: 0.15s; }
.orb i:nth-child(3) { animation-delay: 0.3s; }
@keyframes orb { 0%, 100% { transform: scale(0.6); opacity: 0.4; } 50% { transform: scale(1); opacity: 1; } }

/* Letters rise and brighten in a travelling wave. */
.wave span { display: inline-block; animation: wave 1.4s ease-in-out infinite; }
@keyframes wave { 0%, 100% { opacity: 0.4; transform: translateY(0); } 30% { opacity: 1; transform: translateY(-2px); color: var(--ink-2); } }

/* Height animates via the 0fr → 1fr grid trick (no fixed max-height). */
.think-wrap { display: grid; grid-template-rows: 0fr; opacity: 0; transition: grid-template-rows 0.35s ease, opacity 0.3s ease; }
.think-wrap.open { grid-template-rows: 1fr; opacity: 1; }
.think-inner { overflow: hidden; min-height: 0; }
.think-body {
  margin: 6px 0 2px 3px; padding-left: 14px; border-left: 2px solid var(--border);
  display: flex; flex-direction: column; gap: 6px;
  max-height: 260px; overflow-y: auto;
}
.think-text {
  margin: 0; font-size: 13.5px; line-height: 1.55; font-style: italic;
  color: var(--ink-2); white-space: pre-wrap; word-break: break-word;
  animation: rise 0.35s ease both;
}
.think-step { animation: rise 0.35s ease both; }
@keyframes rise { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
.chip {
  display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px;
  padding: 3px 9px; border-radius: 99px; background: var(--surface-2); color: var(--ink-2);
}
.spin {
  width: 11px; height: 11px; border-radius: 50%;
  border: 2px solid var(--border-2); border-top-color: var(--accent);
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

@media (prefers-reduced-motion: reduce) {
  .orb i, .wave span, .spin, .think-text, .think-step { animation: none; }
  .think-wrap, .chev { transition: none; }
}
</style>
