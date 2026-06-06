<script setup lang="ts">
const props = defineProps<{ modelValue?: string }>()
const emit = defineEmits<{ 'update:modelValue': [string] }>()
const f = ref(false)
const base = {
  width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-sm)', fontSize: '14.5px',
  border: '1px solid var(--border-2)', background: 'var(--surface)', color: 'var(--ink)',
  outline: 'none', transition: 'border 0.15s, box-shadow 0.15s',
  appearance: 'none', paddingRight: '34px', cursor: 'pointer',
}
const ring = computed(() => f.value ? { borderColor: 'var(--accent)', boxShadow: '0 0 0 3px var(--accent-soft)' } : {})
const style = computed(() => ({ ...base, ...ring.value }))
</script>

<template>
  <div style="position: relative">
    <select :value="modelValue" :style="style"
      @focus="f = true" @blur="f = false" @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)">
      <slot />
    </select>
    <UiIcon name="chevDown" :size="16"
      style="position: absolute; right: 11px; top: 50%; transform: translateY(-50%); color: var(--muted); pointer-events: none" />
  </div>
</template>
