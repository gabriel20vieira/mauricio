import { userCount } from '../../utils/db'

// Public — tells the client whether first-run admin setup is required.
// Only exposes the boolean (not the member count) to avoid leaking household size.
export default defineEventHandler(async () => {
  return { needsSetup: (await userCount()) === 0 }
})
