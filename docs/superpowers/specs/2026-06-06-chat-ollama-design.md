# Spec — Assistente de chat (Ollama) com tools

_2026-06-06_

## Objetivo
Chat dentro da app "Lar — contas de casa" que fala com um Ollama local
(`192.168.1.203`, modelo `minimax-m3:cloud`) e usa **tool calling** para
consultar dados, propor escritas e gerar gráficos. O modelo **nunca** muta a BD
diretamente: toda a escrita/eliminação passa por confirmação do utilizador.

## Decisões (fixadas)
- **Política de escrita:** confirmar tudo. Add, update e delete → cartão de
  confirmação no chat → clique → endpoint REST existente (com permissões atuais).
  O modelo só *propõe*.
- **UI:** página dedicada `/assistente` + item no sidebar.
- **Histórico:** persistente (tabelas `chat_conversations`, `chat_messages`).

## Arquitetura
Loop agêntico **no servidor** (toca BD + sessão + permissões). Endpoint
`POST /api/chat` com stream SSE.

```
user → Ollama(/api/chat, tools) → tool_calls?
  → executa READ tools no contexto da sessão
  → propose_*/render_chart → devolve descritor (não muta)
  → resultados (role:tool) → Ollama → ... (cap 6 iterações) → texto final
```

Config via runtimeConfig/env: `OLLAMA_BASE_URL` (def. `http://192.168.1.203:11434`),
`OLLAMA_MODEL` (def. `minimax-m3:cloud`).

## Tools

### Leitura (auto-executa)
- `search_expenses({ month?, cat?, sub?, who?, minAmount?, maxAmount?, text?, limit? })`
- `get_summary({ month? })` — total, por categoria, por pessoa, vs mês anterior
- `get_balance({ month? })` — contribuição vs quota média + transferências
- `list_members()`
- `get_categories()`
- `monthly_totals({ fromMonth?, toMonth? })`

Filtros validados com Zod. Queries Drizzle parametrizadas (sem SQL cru do modelo).

### Proposta (modelo propõe, NUNCA executa)
- `propose_add_expense({ date, amount, cat, sub?, note?, method?, who? })`
- `propose_update_expense({ id, ...campos })`
- `propose_delete_expense({ id })`

Cada uma devolve um descritor `{ kind:'confirm', action, payload, summary }`.
O cliente renderiza cartão + botão. Botão → REST existente:
`POST/PATCH/DELETE /api/expenses[/id]`. Sem novos endpoints de mutação.

### Render
- `render_chart({ type:'donut'|'bar'|'line', title, data })` → devolve spec;
  cliente renderiza inline com `Donut`/`BarChart` existentes.

## Schema (novas tabelas)
```
chat_conversations: id, userId(fk), title, createdAt, updatedAt
chat_messages:      id, conversationId(fk), role(user|assistant|tool),
                    content, toolCalls(json|null), toolCallId(null), createdAt
```

## Endpoints
- `POST /api/chat` — corpo `{ conversationId?, message }`; SSE: tokens, eventos de
  tool, cartões de confirmação, specs de gráfico, mensagem final.
- `GET /api/chat/conversations` — lista do user
- `POST /api/chat/conversations` — cria
- `GET /api/chat/conversations/[id]` — mensagens
- `PATCH /api/chat/conversations/[id]` — renomear
- `DELETE /api/chat/conversations/[id]` — apagar
- Mutações de gasto: reutilizam `/api/expenses*` (já existem).

## Segurança
- Tools correm com `requireUserSession`; reusam permissões REST (user só edita os
  seus gastos; admin tudo). Modelo sem bypass de auth.
- Resultados de tools entram como `role:tool` — nunca como instruções
  (mitiga prompt-injection vindo de notas de gastos). Tamanho limitado.
- Cap de iterações do loop (6). Timeout no fetch ao Ollama.
- Conversas isoladas por `userId` (não se acede às de outros).
- Sem chave de eliminação para o modelo — só `propose_delete_*`.

## UI
- Sidebar: novo item "Assistente".
- `/assistente`: lista de conversas (esquerda) + thread (direita). Mensagens,
  cartões de confirmação (com botão), gráficos inline. Stream token-a-token.

## Fora de âmbito (agora)
- Editar mensagens / regenerar.
- Tools fora de gastos (ex. gerir membros via chat) — adicionável depois.
- Voz / anexos.
