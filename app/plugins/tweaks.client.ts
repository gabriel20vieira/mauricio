// Reconcile the theme with localStorage after hydration so the persisted choice
// (light/dark) survives a refresh. useState hydrates from the server payload, so
// the saved value must be read from localStorage here on the client.
export default defineNuxtPlugin(() => {
  useTweaks().hydrate()
})
