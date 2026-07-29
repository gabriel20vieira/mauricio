<script setup lang="ts">
import type { ConfirmCard } from '~/composables/useChat'

const props = defineProps<{
  card: ConfirmCard
  status?: 'pending' | 'done' | 'error'
  error?: string
}>()
const emit = defineEmits<{ confirm: [] }>()

const { t } = useI18n()

// Field key → the same label the expense/income modal uses, so the card names a
// field exactly as the form the user already knows does.
const FIELD_KEYS: Record<string, string> = {
  date: 'expenseModal.date',
  amount: 'expenseModal.amount',
  cat: 'expenseModal.category',
  sub: 'expenseModal.subcategory',
  note: 'expenseModal.note',
  method: 'expenseModal.method',
  who: 'expenseModal.paidBy',
}
const isIncome = computed(() => props.card.action.endsWith('_income'))
function fieldLabel(field: string) {
  if (field === 'who' && isIncome.value) return t('incomeModal.receivedBy')
  const key = FIELD_KEYS[field]
  return key ? t(key) : field
}

const meta = computed(() => {
  switch (props.card.action) {
    case 'add': return { icon: 'plusCircle', label: t('confirmCard.addExpense'), cta: t('confirmCard.ctaAdd'), danger: false }
    case 'add_income': return { icon: 'trend', label: t('confirmCard.addIncome'), cta: t('confirmCard.ctaAdd'), danger: false }
    case 'update': return { icon: 'pencil', label: t('confirmCard.editExpense'), cta: t('confirmCard.ctaUpdate'), danger: false }
    case 'delete': return { icon: 'trash', label: t('confirmCard.deleteExpense'), cta: t('confirmCard.ctaDelete'), danger: true }
    case 'update_income': return { icon: 'pencil', label: t('confirmCard.editIncome'), cta: t('confirmCard.ctaUpdate'), danger: false }
    case 'delete_income': return { icon: 'trash', label: t('confirmCard.deleteIncome'), cta: t('confirmCard.ctaDelete'), danger: true }
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
    <div :style="{ fontSize: '14px', color: 'var(--ink)', marginBottom: card.changes?.length ? '0' : '12px' }">{{ card.summary }}</div>

    <!-- Before → after, one row per edited field. Everything not listed stays as it is. -->
    <div v-if="card.changes?.length" class="cc-changes">
      <div v-for="c in card.changes" :key="c.field" class="cc-change">
        <div class="cc-field">{{ fieldLabel(c.field) }}</div>
        <div class="cc-from">{{ c.from }}</div>
        <UiIcon name="chevRight" :size="13" style="color: var(--muted); flex-shrink: 0" />
        <div class="cc-to">{{ c.to }}</div>
      </div>
    </div>

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

<style scoped>
.cc-changes {
  margin: 10px 0 12px;
  border-top: 1px solid var(--border);
  padding-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.cc-change {
  display: flex;
  align-items: baseline;
  gap: 7px;
  font-size: 13px;
  flex-wrap: wrap;
}
.cc-field {
  min-width: 92px;
  color: var(--muted);
  font-size: 12px;
}
/* The old value stays legible but visibly superseded; the new one carries the weight. */
.cc-from {
  color: var(--muted);
  text-decoration: line-through;
  text-decoration-color: var(--border-2);
  word-break: break-word;
}
.cc-to {
  color: var(--ink);
  font-weight: 600;
  word-break: break-word;
}
</style>
