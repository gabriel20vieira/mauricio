import type { H3Event } from 'h3'

// Simple in-memory sliding-window limiter. Fine for a single-instance self-hosted
// app; for multi-instance it would need a shared store (Redis).
interface Bucket { count: number, resetAt: number }
const buckets = new Map<string, Bucket>()

export function rateLimit(event: H3Event, opts: { key: string, limit: number, windowMs: number }) {
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  const k = `${opts.key}:${ip}`
  const now = Date.now()

  // Opportunistic prune so the map can't grow unbounded.
  if (buckets.size > 5000) {
    for (const [key, b] of buckets) if (b.resetAt < now) buckets.delete(key)
  }

  let b = buckets.get(k)
  if (!b || b.resetAt < now) { b = { count: 0, resetAt: now + opts.windowMs }; buckets.set(k, b) }
  b.count++
  if (b.count > opts.limit) {
    const retry = Math.ceil((b.resetAt - now) / 1000)
    throw createError({ statusCode: 429, statusMessage: `Demasiadas tentativas. Tente novamente em ${retry}s.` })
  }
}
