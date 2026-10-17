// Provider switch for the assistant: same Ollama-shaped messages/tools in, routed to
// whichever provider the admin picked in the assistant settings.
import { ollamaChat, ollamaComplete, type OllamaMessage, type OllamaTool, type OllamaToolCall } from './ollama'
import { anthropicChat, anthropicComplete } from './anthropic'
import { getAssistantConfig } from './settings'

export async function llmChat(
  messages: OllamaMessage[],
  tools: OllamaTool[],
  onToken: (t: string) => void,
  opts: { signal?: AbortSignal, onThinking?: (t: string) => void } = {},
): Promise<{ content: string, toolCalls: OllamaToolCall[], raw?: unknown[] }> {
  const cfg = await getAssistantConfig()
  return cfg.provider === 'anthropic'
    ? anthropicChat(cfg, messages, tools, onToken, opts)
    : ollamaChat(messages, tools, onToken, opts)
}

export async function llmComplete(messages: OllamaMessage[], opts: { signal?: AbortSignal } = {}): Promise<string> {
  const cfg = await getAssistantConfig()
  return cfg.provider === 'anthropic'
    ? anthropicComplete(cfg, messages, opts)
    : ollamaComplete(messages, opts)
}
