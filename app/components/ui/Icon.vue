<script setup lang="ts">
const props = withDefaults(defineProps<{
  name: string
  size?: number
  sw?: number
}>(), { size: 18, sw: 1.7 })

const ICONS: Record<string, string> = {
  dashboard: 'M3 13h8V3H3v10zm10 8h8V11h-8v10zM3 21h8v-6H3v6zM13 3v6h8V3h-8z',
  receipt: 'M5 3h14v18l-3-2-3 2-3-2-3 2V3z|M9 8h6M9 12h6',
  plus: 'M12 5v14M5 12h14',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2|M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11',
  chart: 'M3 3v18h18|M7 15l3-4 3 3 4-6',
  scale: 'M12 3v18M5 7h14M5 7l-3 6h6l-3-6zM19 7l-3 6h6l-3-6zM8 21h8',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z|M9 12l2 2 4-4',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2|M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16M21 21l-4.3-4.3',
  filter: 'M3 5h18l-7 8v6l-4 2v-8L3 5z',
  chevDown: 'M6 9l6 6 6-6',
  chevRight: 'M9 6l6 6-6 6',
  chevLeft: 'M15 6l-6 6 6 6',
  x: 'M18 6L6 18M6 6l12 12',
  pencil: 'M12 20h9|M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z',
  trash: 'M3 6h18|M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6',
  check: 'M20 6L9 17l-5-5',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4|M16 17l5-5-5-5M21 12H9',
  wallet: 'M3 7h18v12H3z|M3 7l2-4h12l2 4M16 13h2',
  calendar: 'M3 5h18v16H3z|M3 9h18M8 3v4M16 3v4',
  arrowUR: 'M7 17L17 7M7 7h10v10',
  menu: 'M3 6h18M3 12h18M3 18h18',
  more: 'M12 6h.01M12 12h.01M12 18h.01',
  tag: 'M3 3h8l10 10-8 8L3 11V3z|M7.5 7.5h.01',
  bell: 'M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0',
  lock: 'M5 11h14v10H5z|M8 11V7a4 4 0 0 1 8 0v4',
  mail: 'M3 5h18v14H3z|M3 6l9 7 9-7',
  trend: 'M3 17l6-6 4 4 8-8|M21 7h-5M21 7v5',
  card: 'M2 6h20v12H2z|M2 10h20',
  home: 'M3 11l9-8 9 8|M5 9v11h5v-6h4v6h5V9',
  chat: 'M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.6-.8L3 21l1.8-5.9A8.5 8.5 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5z',
  sparkles: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z|M19 15l.7 1.8L21.5 17.5l-1.8.7L19 20l-.7-1.8L16.5 17.5l1.8-.7L19 15z',
  send: 'M22 2L11 13|M22 2l-7 20-4-9-9-4 20-7z',
  plusCircle: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20|M12 8v8M8 12h8',
}
const paths = computed(() => (ICONS[props.name] || '').split('|'))
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" :stroke-width="sw" stroke-linecap="round" stroke-linejoin="round"
    aria-hidden="true">
    <path v-for="(p, i) in paths" :key="i" :d="p" />
  </svg>
</template>
