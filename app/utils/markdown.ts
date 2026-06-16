import { marked } from 'marked'
import DOMPurify from 'dompurify'

marked.setOptions({ breaks: true, gfm: true })

// Render assistant markdown to sanitized HTML. Chat messages are fetched/rendered
// client-side, so DOMPurify (which needs the DOM) only runs there; on the server we
// return the parsed HTML unchanged (never reached for messages, but safe).
export function renderMarkdown(text: string): string {
  if (!text) return ''
  const html = marked.parse(text, { async: false }) as string
  return import.meta.client ? DOMPurify.sanitize(html) : html
}
