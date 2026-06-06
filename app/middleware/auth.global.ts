export default defineNuxtRouteMiddleware(async (to) => {
  const { loggedIn, user } = useUserSession()

  // First-run gate: if no users exist, force the admin setup screen.
  if (!loggedIn.value) {
    const status = await $fetch<{ needsSetup: boolean }>('/api/auth/status').catch(() => ({ needsSetup: false }))

    if (status.needsSetup) {
      return to.path === '/setup' ? undefined : navigateTo('/setup')
    }
    // Users exist but nobody is authenticated → login.
    if (to.path !== '/login') return navigateTo('/login')
    return
  }

  // Authenticated: keep them out of the auth screens.
  if (to.path === '/login' || to.path === '/setup') return navigateTo('/')

  // Admin-only area.
  if (to.path.startsWith('/administracao') && user.value?.role !== 'admin') {
    return navigateTo('/')
  }
})
