<script setup lang="ts">
const props = defineProps<{
  modelValue?: string | number
  prefix?: string
  type?: string
  placeholder?: string
  step?: string
  required?: boolean
  disabled?: boolean
}>()
const emit = defineEmits<{ 'update:modelValue': [string] }>()

const f = ref(false)
const base = {
  width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-sm)', fontSize: '14.5px',
  border: '1px solid var(--border-2)', background: 'var(--surface)', color: 'var(--ink)',
  outline: 'none', transition: 'border 0.15s, box-shadow 0.15s',
}
const ring = computed(() => f.value ? { borderColor: 'var(--accent)', boxShadow: '0 0 0 3px var(--accent-soft)' } : {})
const style = computed(() => ({ ...base, ...ring.value, ...(props.prefix ? { paddingLeft: '26px' } : {}) }))
</script>

<template>
  <div v-if="prefix" style="position: relative">
    <span style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--muted); font-size: 14.5px; pointer-events: none">{{ prefix }}</span>
    <input :value="modelValue" :type="type || 'text'" :placeholder="placeholder" :step="step" :required="required" :disabled="disabled"
      :style="style" @focus="f = true" @blur="f = false" @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)" />
  </div>
  <input v-else :value="modelValue" :type="type || 'text'" :placeholder="placeholder" :step="step" :required="required" :disabled="disabled"
    :style="style" @focus="f = true" @blur="f = false" @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)" />
</template>
