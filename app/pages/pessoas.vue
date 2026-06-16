<script setup lang="ts">
import { catColor, firstName } from '~~/shared/config'

definePageMeta({ titleKey: 'nav.people', subtitleKey: 'pageSub.people' })
const store = useStore()
const { user } = useUserSession()
const { isDark } = useTweaks()
onMounted(() => store.ensure())

const isAdmin = computed(() => user.value?.role === 'admin')

const rows = computed(() => store.activeMembers.value.map((m) => {
  const mine = store.expenses.value.filter(e => e.userId === m.id)
  return { member: m, total: mine.reduce((a, e) => a + e.amountCents, 0), count: mine.length }
}))
</script>

<template>
  <div style="max-width: 900px; margin: 0 auto; display: flex; flex-direction: column; gap: 16px">
    <div v-if="isAdmin" style="display: flex; justify-content: flex-end">
      <UiButton icon="plus" @click="navigateTo('/administracao')">{{ $t('people.addMember') }}</UiButton>
    </div>

    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px">
      <UiCard v-for="r in rows" :key="r.member.id" :pad="20" hover>
        <div style="display: flex; align-items: center; gap: 13px; margin-bottom: 16px">
          <UiAvatar :member="r.member" :size="46" />
          <div style="flex: 1; min-width: 0">
            <div style="display: flex; align-items: center; gap: 8px">
              <span style="font-weight: 600; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{{ r.member.name }}</span>
              <UiTag v-if="r.member.role === 'admin'" tone="admin">Admin</UiTag>
            </div>
            <div style="font-size: 12.5px; color: var(--muted)">{{ r.member.email }}</div>
          </div>
        </div>
        <div style="display: flex; justify-content: space-between; padding-top: 14px; border-top: 1px solid var(--border)">
          <div><div class="tnum" style="font-weight: 600">{{ $n(r.total / 100, 'currency') }}</div><div style="font-size: 12px; color: var(--muted)">{{ $t('people.total') }}</div></div>
          <div style="text-align: right"><div class="tnum" style="font-weight: 600">{{ r.count }}</div><div style="font-size: 12px; color: var(--muted)">{{ $t('people.expensesCount') }}</div></div>
        </div>
      </UiCard>
    </div>
  </div>
</template>
