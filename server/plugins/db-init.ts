import { initDb } from '../utils/db'

// Create/patch the MySQL schema (and seed categories) before the app serves
// requests. Nitro awaits plugin setup on startup.
export default defineNitroPlugin(async () => {
  await initDb()
})
