# Lar — contas de casa · Design Spec

_2026-06-06_

## Purpose

A self-hosted Nuxt app for a household (family/couple) to track shared expenses.
Authentication with two roles. **Registration is admin-only** — there is no public
signup. On first run (empty database) the app shows a one-time **admin setup** form so
the household creates its first administrator; from then on only admins create members.

Functional and visual requirements come from the Claude Design handoff bundle
(`.design-ref/`): prototype "Lar — contas de casa", PT-PT, Euro, clean minimal,
neutral/sober tones, light + dark mode.

## Decisions

- **Framework:** Nuxt 4 + Nitro, TypeScript.
- **Persistence:** SQLite (local file) via Drizzle ORM + better-sqlite3.
- **Auth:** `nuxt-auth-utils` — sealed session cookie, scrypt password hashing.
- **Scope:** full app (all prototype screens).

## Data model (Drizzle / SQLite)

`users`
- `id` text pk, `name`, `email` unique, `passwordHash`, `role` (`admin`|`user`),
  `hue` int (avatar colour), `createdAt`.

`expenses`
- `id` text pk, `date` (ISO yyyy-mm-dd), `amountCents` int, `cat`, `sub`, `note`,
  `method`, `userId` (who paid → users.id), `createdAt`.

Categories are static config (7 fixed categories with sub-lists), not a table —
matches the prototype's `CATEGORIES`.

## Auth flow (core requirement)

Server util `userCount()`. Global route middleware + server guards:

1. **0 users** → every route redirects to `/setup`. Setup form registers the first
   user as `role: admin`. This is the only public registration path and only works
   while the DB is empty (server re-checks count to prevent a second use).
2. **≥1 user, not authenticated** → redirect to `/login`.
3. **Authenticated** → app.

- **Admin-only registration:** new members are created by an admin in *Administração*
  (name, email, temporary password, role). No public `/register`.
- `/login`: prototype two-panel branded screen, real email + password.
- Roles: `admin` edits anyone's expenses and manages members; `user` sees everything
  but edits only their own expenses and cannot access *Administração*.

## Components

UI primitives ported from `ui.jsx` to Vue SFCs: Icon, Avatar, AvatarStack, Button,
IconButton, Card, CatDot, CatPill, Field, Input, Select, Segmented, Toggle, Modal,
Donut, BarChart, MiniBar, Tag, SectionTitle, EmptyState.

Composables: `useTheme` (light/dark), `useTweaks` (theme, density, accent hue, radius;
persisted to localStorage; no-flash inline init). Helpers from `data.jsx`: `euro`,
date formatting, `catColor`/`catSoft`, category + member config.

Layout: sidebar nav + topbar + responsive mobile drawer / bottom-nav (breakpoints from
`styles.css`).

## Screens

Login, Setup (first-run admin), Resumo (dashboard), Gastos (list + filters + add/edit
modal), Relatórios, Balanço, Pessoas, Administração (admin-only), Perfil.

## Server API (Nitro `/server/api`)

- `auth/setup` POST — create first admin (guarded by count==0).
- `auth/login` POST, `auth/logout` POST, `auth/session` GET.
- `expenses` GET/POST, `expenses/[id]` PATCH/DELETE — permission: user edits only own.
- `users` GET/POST, `users/[id]` PATCH/DELETE — admin-only.

Permissions enforced server-side and mirrored in UI (lock icons on others' expenses,
Administração hidden for non-admins).

## Visual system (from styles.css)

- Fonts: Geist (UI), Geist Mono (numbers).
- OKLCH theme tokens for light/dark; accent hue 165 (sober green), radius 14px.
- Cards with subtle shadow, donut + bar charts (SVG), category hues.
- Animations rendered at final state (prototype dropped opacity-0 entrances).

## Seed

Optional demo data (`Casa Silva`, Apr–Jun 2026) behind a dev flag for screenshots/demo.

## Out of scope (YAGNI)

Public signup, password reset email, recurring expenses, receipt attachments, export —
noted as possible future work, not built now.
