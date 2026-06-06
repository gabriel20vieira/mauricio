<script setup lang="ts">
interface Opt { value: string; label: string }
const props = withDefaults(defineProps<{
  options: (string | Opt)[]
  modelValue: string
  size?: 'sm' | 'md'
}>(), { size: 'md' })
const emit = defineEmits<{ 'update:modelValue': [string] }>()

const norm = computed<Opt[]>(() => props.options.map(o => typeof o === 'string' ? { value: o, label: o } : o))
function btnStyle(on: boolean) {
  return {
    padding: props.size === 'sm' ? '5px 11px' : '7px 15px',
    fontSize: props.size === 'sm' ? '12.5px' : '13.5px', fontWeight: 530,
    border: 'none', borderRadius: 'calc(var(--radius-sm) - 3px)', transition: 'all 0.15s',
    background: on ? 'var(--raised)' : 'transparent', color: on ? 'var(--ink)' : 'var(--muted)',
    boxShadow: on ? 'var(--shadow-sm)' : 'none',
  }
}
</script>

<template>
  <div style="display: inline-flex; background: var(--surface-2); border-radius: var(--radius-sm); padding: 3px; gap: 2px; border: 1px solid var(--border)">
    <button v-for="o in norm" :key="o.value" :style="btnStyle(o.value === modelValue)"
      @click="emit('update:modelValue', o.value)">{{ o.label }}</button>
  </div>
</template>
