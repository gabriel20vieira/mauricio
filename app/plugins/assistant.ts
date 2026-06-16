// Loads the assistant enabled flag once (universal) so the nav + route reflect it.
export default defineNuxtPlugin(async () => {
  const { loggedIn } = useUserSession()
  if (!loggedIn.value) return
  const enabled = useAssistantEnabled()
  const st = await $fetch<{ enabled: boolean }>('/api/assistant/state').catch(() => ({ enabled: true }))
  enabled.value = st.enabled
})
