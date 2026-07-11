<script setup lang="ts">
import type { ConfirmCard } from '~/composables/useChat'

const props = defineProps<{
  card: ConfirmCard
  status?: 'pending' | 'done' | 'error'
  error?: string
}>()
const emit = defineEmits<{ confirm: [] }>()

const { t } = useI18n()

const meta = computed(() => {
  switch (props.card.action) {
    case 'add': return { icon: 'plusCircle', label: t('confirmCard.addExpense'), cta: t('confirmCard.ctaAdd'), danger: false }
    case 'add_income': return { icon: 'trend', label: t('confirmCard.addIncome'), cta: t('confirmCard.ctaAdd'), danger: false }
    case 'update': return { icon: 'pencil', label: t('confirmCard.editExpense'), cta: t('confirmCard.ctaUpdate'), danger: false }
    case 'delete': return { icon: 'trash', label: t('confirmCard.deleteExpense'), cta: t('confirmCard.ctaDelete'), danger: true }
  }
})
</script>

<template>
  <div :style="{
    border: '1px solid var(--border-2)', borderRadius: 'var(--radius)', background: 'var(--surface)',
    padding: '14px 16px', marginTop: '8px', maxWidth: '460px',
  }">
    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px">
      <UiIcon :name="meta!.icon" :size="16" :style="{ color: meta!.danger ? 'var(--neg)' : 'var(--accent)' }" />
      <span style="font-size: 12.5px; font-weight: 600; color: var(--ink-2)">{{ meta!.label }}</span>
      <UiTag v-if="status === 'done'" tone="accent">{{ $t('confirmCard.done') }}</UiTag>
    </div>
    <div style="font-size: 14px; color: var(--ink); margin-bottom: 12px">{{ card.summary }}</div>

    <div v-if="error" style="font-size: 12.5px; color: var(--neg); margin-bottom: 10px">{{ error }}</div>

    <div v-if="status !== 'done'" style="display: flex; gap: 8px">
      <UiButton :variant="meta!.danger ? 'danger' : 'primary'" size="sm" :disabled="status === 'pending'" @click="emit('confirm')">
        {{ status === 'pending' ? $t('common.processing') : meta!.cta }}
      </UiButton>
    </div>
    <div v-else style="display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--pos)">
      <UiIcon name="check" :size="15" /> {{ $t('confirmCard.confirmed') }}
    </div>
  </div>
</template>
