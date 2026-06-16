# Impacto operacional dos problemas encontrados

_Data: 2026-06-07 · Complemento de [2026-06-07-revisao-codigo-e-seguranca.md](2026-06-07-revisao-codigo-e-seguranca.md)._

Pergunta: **cada problema interfere com a atividade normal da aplicação**, ou é só uma
exposição de segurança que não afeta o uso do dia-a-dia?

Classificação:
- 🔴 **Interfere já** — afeta o funcionamento/integridade/UX em uso normal, sem ataque.
- 🟠 **Só sob abuso/ataque** — app funciona normalmente; só há impacto se explorado.
- ⚪ **Não interfere** — exposição/design; comportamento normal inalterado.

---

## Resumo

| # | Problema | Interfere? | Quando se manifesta |
|---|----------|-----------|---------------------|
| 1.1 | `seed` sem auth | 🟠 Só sob abuso | App funciona; risco só se alguém chamar `/api/seed` num deploy vazio |
| 1.2 | Segredo de sessão placeholder | 🟠 Só sob abuso | App funciona; risco só se segredo previsível em produção |
| 1.3 | Sem rate-limiting | 🟠 Só sob abuso | Login normal ok; degradação só sob brute-force/spam de chat |
| 1.4 | Cookie sem endurecimento | ⚪ Não | Sessão funciona; é robustez/CSRF, não afeta uso |
| 1.5 | **Cascade delete apaga gastos** | 🔴 **Interfere já** | Sempre que um admin apaga um membro — perde histórico |
| 1.6 | Injeção de prompt | 🟠 Só sob abuso | Chat normal ok; só com dados maliciosos (e exige confirmação) |
| 1.7 | Corrida TOCTOU no setup | ⚪ Quase nunca | Só com 2 pedidos `/setup` simultâneos no 1.º arranque |
| 1.8 | `userCount` público | ⚪ Não | Necessário ao fluxo; sem efeito funcional |
| 1.9 | Sessão não-revogável | ⚪ Não | Logout funciona para o utilizador; sem efeito no uso |
| 1.10 | Visibilidade total da casa | ⚪ Não (design) | É o comportamento pretendido |
| R1 | `who` não validado | 🔴 **Interfere já** | Admin/IA atribui gasto a id inexistente → erro 500 |
| R2 | `make_chart` dims inválidas | 🟠 Menor | Gráfico inesperado; sem erro |
| R3 | README vs `.env.production` | 🔴 Interfere (setup) | Clone fresco não tem o ficheiro indicado → fricção a arrancar |

---

## Detalhe dos que **interferem já** (🔴)

### 1.5 — Eliminação em cascata apaga gastos (integridade de dados)
**Impacto real, em uso normal.** Não é preciso ataque: quando um admin remove um membro
em *Administração* (operação legítima e exposta na UI), o `onDelete: 'cascade'` apaga
**todos os gastos desse membro** e as conversas. Consequências imediatas:
- Os totais do **Resumo**, **Relatórios** e **Balanço** mudam retroativamente.
- Perde-se histórico contabilístico de forma **irreversível e silenciosa** (sem aviso).

É o problema com **maior impacto operacional** — corrompe a própria função da app
(registar e somar gastos da casa) numa ação de gestão comum.

### R1 — `who` não validado → erro 500
Quando um **admin** regista/edita um gasto em nome de outra pessoa (`who`), ou a **IA**
propõe `propose_add_expense` com um id de membro que não existe, o insert falha na FK e
devolve **500** em vez de uma mensagem clara. Acontece em uso normal (a funcionalidade de
"pago por" é exposta a admins e usada pelo assistente). Quebra a ação de gravar gasto.

### R3 — README aponta para ficheiro ignorado pelo git
`cp .env.production .env` falha num clone fresco (`.env.production` está em `.gitignore`).
Interfere no **arranque do projeto** por um novo programador — não no runtime, mas na
operação de pôr a app a correr.

---

## Detalhe dos que **só interferem sob abuso** (🟠)

- **1.1 / 1.2 / 1.3 / 1.6** — em condições normais a app funciona na perfeição. O impacto
  só aparece se houver **intenção maliciosa** (seed indevido, forja de cookie, brute-force,
  prompt envenenado). São riscos de **segurança**, não defeitos de funcionamento. Ainda
  assim, **1.3** tem uma vertente operacional benigna: cada pedido de chat encadeia até 6
  chamadas ao Ollama → **latência e custo** percetíveis mesmo sem abuso (UX a vigiar).

---

## Detalhe dos que **não interferem** (⚪)

- **1.4, 1.8, 1.9, 1.10** — são endurecimento, design ou exposição informativa. O
  comportamento normal da aplicação é exatamente o esperado; não há degradação funcional.
- **1.7** — exige concorrência exata no primeiro arranque; na prática o setup é feito uma
  vez por uma pessoa.

---

## Nota: um problema operacional **já corrigido** nesta sessão

O erro `FOREIGN KEY constraint failed` ao adicionar gasto (sessão órfã após a BD ser
recriada) **interferia diretamente** — devolvia 500. Já foi mitigado com `requireDbUser`
([server/utils/auth.ts](../../server/utils/auth.ts)), que passa a devolver **401** e a
limpar a sessão. Citado aqui só para contexto; não consta como pendente.

---

## Conclusão

- **Atividade normal hoje:** a app funciona. Os únicos defeitos que afetam o uso corrente
  são **1.5 (cascade delete)** e **R1 (`who` → 500)** — ambos de integridade/robustez, não
  de segurança ofensiva.
- **Segurança:** os riscos ALTOS (1.1, 1.2) **não interferem** no funcionamento, mas são
  críticos **antes de produção** (tomada de conta).
- **Recomendação de foco operacional:** 1.5 e R1 primeiro (afetam o produto a funcionar);
  1.1 e 1.2 antes de qualquer deploy público (afetam a segurança, não o uso).

_Avaliação apenas — nenhuma alteração de código feita._
