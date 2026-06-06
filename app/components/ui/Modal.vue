<script setup lang="ts">
const props = withDefaults(defineProps<{
  open: boolean
  width?: number
  title?: string
}>(), { width: 520 })
const emit = defineEmits<{ close: [] }>()

function onKey(e: KeyboardEvent) { if (e.key === 'Escape') emit('close') }
watch(() => props.open, (o) => {
  if (!import.meta.client) return
  if (o) window.addEventListener('keydown', onKey)
  else window.removeEventListener('keydown', onKey)
})
onUnmounted(() => { if (import.meta.client) window.removeEventListener('keydown', onKey) })
</script>

<template>
  <Teleport to="body">
    <div v-if="open" @mousedown="emit('close')" style="position: fixed; inset: 0; z-index: 200; background: oklch(0.15 0.01 80 / 0.45); backdrop-filter: blur(3px); display: grid; place-items: center; padding: 20px">
      <div @mousedown.stop :style="{ width: '100%', maxWidth: `${width}px`, maxHeight: '90vh', overflowY: 'auto', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', animation: 'popIn 0.2s ease' }">
        <div v-if="title" style="display: flex; align-items: center; justify-content: space-between; padding: 18px 22px; border-bottom: 1px solid var(--border)">
          <h3 style="font-size: 17px; font-weight: 600">{{ title }}</h3>
          <UiIconButton name="x" :size="18" label="Fechar" @click="emit('close')" />
        </div>
        <slot />
      </div>
    </div>
  </Teleport>
</template>
