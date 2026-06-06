import { userCount } from '../../utils/db'

// Public — tells the client whether first-run admin setup is required.
export default defineEventHandler(() => {
  const count = userCount()
  return { userCount: count, needsSetup: count === 0 }
})
