# Lar — contas de casa

App Nuxt 4 para gerir as contas partilhadas de uma casa (família/casal). Login com
dois perfis, **registo apenas por administrador**, e ecrã de configuração inicial na
primeira utilização.

Design recriado a partir do handoff do Claude Design (PT-PT, Euro, claro/escuro).

## Stack

- **Nuxt 4** + Nitro, TypeScript
- **SQLite** (ficheiro local) via Drizzle ORM + better-sqlite3 — zero config
- **nuxt-auth-utils** — sessão em cookie selado, hash de password com scrypt

## Arrancar

```bash
npm install
cp .env.example .env        # define NUXT_SESSION_PASSWORD (mín. 32 caracteres)
npm run dev                 # http://localhost:3000
```

A base de dados (`server/db/lar.sqlite`) é criada automaticamente no primeiro arranque.

## Fluxo de autenticação

1. **Primeira utilização** (sem utilizadores) → a app mostra `/setup` para criar o
   **primeiro administrador**. É o único registo público, e só funciona com a base de
   dados vazia.
2. Com utilizadores e sem sessão → `/login`.
3. Novos membros são criados **apenas por um administrador** em *Administração*.

### Permissões

- **Administrador**: edita gastos de qualquer pessoa, gere membros (criar, editar
  função, repor password, remover) e categorias.
- **Membro**: vê tudo, mas só edita os seus próprios gastos; não acede a *Administração*.

## Assistente (chat com Ollama)

Página `/assistente` — chat ligado a um Ollama local que usa **tool calling** para
consultar dados, propor escritas e gerar gráficos. O modelo **nunca** muta a base de
dados: add/editar/eliminar passam por um **cartão de confirmação** no chat → o clique
chama o endpoint REST existente (com as permissões atuais).

- **Tools de leitura** (auto): `search_expenses`, `get_summary`, `get_balance`,
  `monthly_totals`, `list_members`, `get_categories`.
- **Tools de proposta** (mostram cartão, não gravam): `propose_add_expense`,
  `propose_update_expense`, `propose_delete_expense`.
- **Gráficos**: `render_chart` (donut/barras/linha), renderizado inline.

Configuração (env / `runtimeConfig`):

```bash
OLLAMA_BASE_URL=http://192.168.1.203:11434   # máquina onde o Ollama corre
OLLAMA_MODEL=minimax-m3:cloud                # modelo com suporte a tools
```

O histórico de conversas é persistido (tabelas `chat_conversations`, `chat_messages`).

## Dados de demonstração (opcional)

Com a base de dados vazia:

```bash
curl -X POST http://localhost:3000/api/seed
```

Cria a família "Casa Silva" (Abr–Jun 2026). Todos entram com a password `demo1234`:

- `maria@casa.pt` — Administrador
- `joao@casa.pt`, `rita@casa.pt` — Membros

## Docker

Imagem multi-stage (Node 24, build do Nuxt + `better-sqlite3` nativo). A base de dados
SQLite vive num volume (`lar_data` → `/app/data/lar.sqlite`), persistente entre reinícios.

```bash
cp .env.example .env         # define um NUXT_SESSION_PASSWORD forte e aleatório (mín. 32 caracteres)
docker compose up -d --build # http://localhost:3000
```

> O arranque em produção **falha** se `NUXT_SESSION_PASSWORD` ficar com o valor de exemplo
> ou tiver menos de 32 caracteres (proteção contra falsificação de sessão).
> `OLLAMA_BASE_URL`/`OLLAMA_MODEL` são opcionais (têm defaults).

Primeiro arranque → BD vazia → a app mostra o form de registo do administrador.

Build/run sem compose:

```bash
docker build -t lar-contas .
docker run -p 3000:3000 -e NUXT_SESSION_PASSWORD=<segredo-32+> -v lar_data:/app/data lar-contas
```

## Ecrãs

Login · Configuração inicial · Resumo · Gastos (lista, filtros, criar/editar) ·
Relatórios · Balanço · Pessoas · Administração · Perfil.

## Estrutura

- `app/` — páginas, layouts, componentes (`components/ui` primitivos, `components/App`
  específicos), composables, CSS
- `server/api` — endpoints de auth, expenses, users
- `server/db` — schema Drizzle + ligação SQLite
- `shared/config.ts` — categorias, formatação Euro, helpers de data (cliente + servidor)
- `docs/superpowers/specs` — spec de design
