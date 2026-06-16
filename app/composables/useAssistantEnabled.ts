// Whether the assistant feature is enabled (admin-controlled). Populated by the
// assistant.client/server plugin; defaults to true.
export function useAssistantEnabled() {
  return useState<boolean>('assistant-enabled', () => true)
}
