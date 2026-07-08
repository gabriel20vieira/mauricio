import { startRealtime } from '../utils/realtime'

// Start the WebSocket server (port 5003) once the node server boots.
export default defineNitroPlugin(() => {
  startRealtime()
})
