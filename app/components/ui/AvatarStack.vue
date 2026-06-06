<script setup lang="ts">
withDefaults(defineProps<{
  members: { id: string; name: string; hue: number }[]
  size?: number
}>(), { size: 28 })
</script>

<template>
  <div style="display: flex">
    <div v-for="(m, i) in members" :key="m.id"
      :style="{ marginLeft: i ? `${-size * 0.32}px` : '0', zIndex: members.length - i }">
      <UiAvatar :member="m" :size="size" ring />
    </div>
  </div>
</template>
