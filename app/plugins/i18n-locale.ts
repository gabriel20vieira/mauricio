// Applies locale precedence after i18n's browser detection:
//   admin-forced > user preference > browser-detected > English fallback.
// Runs universally so the locale is correct during SSR (no flash).
export default defineNuxtPlugin(async (nuxtApp) => {
  const i18n = nuxtApp.$i18n as any
  if (!i18n?.setLocale) return

  const { data } = await useAsyncData('i18n-state', () =>
    $fetch<{ forced: string | null, userLocale: string | null }>('/api/i18n/state').catch(() => ({ forced: null, userLocale: null })),
  )

  const effective = data.value?.forced || data.value?.userLocale
  if (effective && i18n.locale.value !== effective) {
    await i18n.setLocale(effective)
  }
})
