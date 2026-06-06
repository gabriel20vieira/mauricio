<script setup lang="ts">
const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [boolean] }>()
const track = computed(() => ({
  width: '44px', height: '26px', borderRadius: '99px', border: 'none', padding: '3px',
  transition: 'background 0.2s', background: props.modelValue ? 'var(--accent)' : 'var(--border-2)', display: 'flex',
}))
const knob = computed(() => ({
  width: '20px', height: '20px', borderRadius: '50%', background: 'white', transition: 'transform 0.2s',
  transform: props.modelValue ? 'translateX(18px)' : 'none', boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
}))
</script>

<template>
  <button :style="track" @click="emit('update:modelValue', !modelValue)"><span :style="knob" /></button>
</template>
