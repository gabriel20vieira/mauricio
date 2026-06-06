// Re-apply persisted tweaks to the DOM after hydration so reactive state and
// the document attributes stay in sync.
export default defineNuxtPlugin(() => {
  const { tweaks, apply } = useTweaks()
  apply(tweaks.value)
})
