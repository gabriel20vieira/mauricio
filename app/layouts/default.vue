<script setup lang="ts">
const { user, clear } = useUserSession()
const { navOpen, openNewExpense } = useAppUi()
const { toggleTheme, isDark } = useTweaks()

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await clear()
  await navigateTo('/login')
}
const header = usePageHeader()
const route = useRoute()
const router = useRouter()

const nav = [
  { to: '/', label: 'Resumo', icon: 'dashboard', group: 'nav' },
  { to: '/gastos', label: 'Gastos', icon: 'receipt', group: 'nav' },
  { to: '/relatorios', label: 'Relatórios', icon: 'chart', group: 'nav' },
  { to: '/balanco', label: 'Balanço', icon: 'scale', group: 'nav' },
  { to: '/assistente', label: 'Assistente', icon: 'sparkles', group: 'nav' },
  { to: '/pessoas', label: 'Pessoas', icon: 'users', group: 'nav' },
  { to: '/administracao', label: 'Administração', icon: 'shield', group: 'mgmt', adminOnly: true },
]
const visibleNav = computed(() => nav.filter(n => !n.adminOnly || user.value?.role === 'admin'))
const navMain = computed(() => visibleNav.value.filter(n => n.group === 'nav'))
const navMgmt = computed(() => visibleNav.value.filter(n => n.group === 'mgmt'))

const bottomNav = computed(() => visibleNav.value.slice(0, 5))

watch(() => route.path, () => { navOpen.value = false })

function navLinkStyle(active: boolean) {
  return {
    display: 'flex', alignItems: 'center', gap: '11px', padding: '9px 12px', borderRadius: 'var(--radius-sm)',
    fontSize: '14px', fontWeight: 500, transition: 'all 0.14s', cursor: 'pointer',
    background: active ? 'var(--accent-soft)' : 'transparent',
    color: active ? 'var(--accent)' : 'var(--ink-2)',
  }
}
</script>

<template>
  <div style="display: flex; min-height: 100vh">
    <!-- Sidebar -->
    <div class="nav-wrap" :class="{ open: navOpen }">
      <div class="nav-scrim" @click="navOpen = false" />
      <aside class="sidebar" style="width: 250px; flex-shrink: 0; background: var(--surface); border-right: 1px solid var(--border); display: flex; flex-direction: column; padding: 16px 14px; gap: 6px">
        <!-- Brand -->
        <div style="display: flex; align-items: center; gap: 11px; padding: 6px 8px 14px">
          <div style="width: 36px; height: 36px; border-radius: 10px; background: var(--accent); color: var(--accent-ink); display: grid; place-items: center">
            <UiIcon name="home" :size="20" />
          </div>
          <span style="font-size: 18px; font-weight: 700; letter-spacing: -0.02em">Lar</span>
        </div>

        <UiButton icon="plus" full @click="openNewExpense">Novo gasto</UiButton>

        <div style="font-size: 11px; font-weight: 600; letter-spacing: 0.06em; color: var(--faint); padding: 16px 8px 6px">NAVEGAÇÃO</div>
        <NuxtLink v-for="n in navMain" :key="n.to" :to="n.to" :style="navLinkStyle(route.path === n.to)">
          <UiIcon :name="n.icon" :size="19" />{{ n.label }}
        </NuxtLink>

        <template v-if="navMgmt.length">
          <div style="font-size: 11px; font-weight: 600; letter-spacing: 0.06em; color: var(--faint); padding: 16px 8px 6px">GESTÃO</div>
          <NuxtLink v-for="n in navMgmt" :key="n.to" :to="n.to" :style="navLinkStyle(route.path.startsWith(n.to))">
            <UiIcon :name="n.icon" :size="19" />{{ n.label }}
          </NuxtLink>
        </template>

        <div style="flex: 1" />

        <!-- User card + logout -->
        <div style="display: flex; align-items: center; gap: 6px">
          <button style="flex: 1; min-width: 0; display: flex; align-items: center; gap: 11px; padding: 9px; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--surface); text-align: left"
            @click="router.push('/perfil')">
            <UiAvatar :member="user ? { name: user.name, hue: user.hue } : null" :size="34" />
            <div style="flex: 1; min-width: 0">
              <div style="font-size: 13.5px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{{ user?.name }}</div>
              <div style="font-size: 12px; color: var(--muted)">{{ user?.role === 'admin' ? 'Administrador' : 'Membro' }}</div>
            </div>
          </button>
          <UiIconButton name="logout" label="Terminar sessão" @click="logout" />
        </div>
      </aside>
    </div>

    <!-- Main column -->
    <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; height: 100vh">
      <header class="topbar" style="display: flex; align-items: center; gap: 14px; padding: 16px 26px; border-bottom: 1px solid var(--border); background: var(--surface)">
        <button class="menu-btn" style="display: none; place-items: center; width: 38px; height: 38px; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--surface); color: var(--ink-2)"
          @click="navOpen = true">
          <UiIcon name="menu" :size="20" />
        </button>
        <div style="flex: 1; min-width: 0">
          <h1 style="font-size: 19px; font-weight: 700; letter-spacing: -0.02em">{{ header.title }}</h1>
          <div class="topbar-sub" style="font-size: 13px; color: var(--muted)">{{ header.sub }}</div>
        </div>
        <UiIconButton :name="isDark ? 'sun' : 'moon'" label="Alternar tema" @click="toggleTheme" />
        <div class="add-btn-top"><UiButton icon="plus" @click="openNewExpense">Novo gasto</UiButton></div>
      </header>

      <main class="main-scroll" style="flex: 1; overflow-y: auto; padding: 26px 26px 40px">
        <slot />
      </main>

      <!-- Mobile bottom nav -->
      <nav class="bottom-nav" style="display: none; position: sticky; bottom: 0; border-top: 1px solid var(--border); background: var(--surface); padding: 8px 6px; gap: 2px; z-index: 60">
        <NuxtLink v-for="n in bottomNav" :key="n.to" :to="n.to"
          :style="{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', padding: '6px 2px', fontSize: '10.5px', fontWeight: 600, color: route.path === n.to ? 'var(--accent)' : 'var(--muted)' }">
          <UiIcon :name="n.icon" :size="20" />{{ n.label }}
        </NuxtLink>
        <button style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 6px 2px; font-size: 10.5px; font-weight: 600; color: var(--accent); background: none; border: none"
          @click="openNewExpense">
          <UiIcon name="plus" :size="20" />Gasto
        </button>
      </nav>
    </div>

    <AppExpenseModal />
  </div>
</template>
