// Fails fast in production if the session secret is missing, too short, or still a
// known placeholder — a predictable secret lets anyone forge an admin session cookie.
const PLACEHOLDER_MARKERS = ['change-me', 'dev-only', 'min-32-chars']

export default defineNitroPlugin(() => {
  const secret = process.env.NUXT_SESSION_PASSWORD || ''
  const weak = secret.length < 32 || PLACEHOLDER_MARKERS.some(m => secret.includes(m))
  if (!weak) return

  const msg = '[lar] NUXT_SESSION_PASSWORD em falta ou inseguro (placeholder/<32 chars). '
    + 'Gere um segredo aleatório forte — sessões podem ser forjadas.'
  if (import.meta.dev) {
    console.warn(msg)
  } else {
    throw new Error(msg)
  }
})
