// API responses are per-user, session-scoped and change on every write, so no layer
// between the DB and the page may hold on to them: not the browser's HTTP cache, not
// a proxy, not a service worker. Without this, a GET with no cache headers is open to
// heuristic caching and a write can read back stale data.
export default defineEventHandler((event) => {
  if (!event.path.startsWith('/api/')) return
  setResponseHeader(event, 'Cache-Control', 'no-store, no-cache, must-revalidate')
})
