# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

**SendYurt** — a Next.js 14 (App Router) fintech web app for Uzbek labor migrants:
remittance rate comparison, family budget dashboard, a "Trust Score" engine, an
AI assistant, and a premium marketing/pitch landing page. Fully trilingual
(uz / ru / en). Production-quality; phases 1–10, security hardening, a Vitest
suite, an 11-phase Uzbek design polish, a 6-feature batch, the AI assistant, and
the pitch site are all complete.

## Environment quirks (read first — this is a non-standard Windows setup)

- **Project root:** `D:\My code\sendyurt` (note the space). `D:\Git` is the **Git
  install directory**, not a project folder.
- **Node is portable** at `D:\tools\node` and is NOT on the default PATH. Prefix
  every shell command that runs node/npm/npx with:
  `$env:Path = "D:\tools\node;$env:Path"` (PowerShell), or in the Bash tool
  export the equivalent. Nothing node-related works without this.
- **Git binary:** `D:\Git\cmd\git.exe` (invoke by full path in the Bash tool).
- **Build isolation:** the dev server owns `.next`. To build for prod without
  killing the running dev server, use a separate dist dir:
  `NEXT_DIST_DIR=.next-prod npm run build` (there is a `.next-prod` for this).
- **Preview:** launch config at `D:\Git\.claude\launch.json`; the dev launcher is
  wrapped in `D:\tools\sendyurt-dev.cmd`. Use the `preview_*` tools, not Bash, to
  run the dev server. `preview_screenshot` times out (~30s) in this environment —
  verify via DOM/computed-style/text tools instead.

## Commands

Prefix node commands with the PATH shim above.

- Dev server: `npm run dev` (prefer the preview tools)
- Prod build (isolated): `NEXT_DIST_DIR=.next-prod npm run build`
- Tests: `npm test` (Vitest, run mode) — 47 tests across `tests/*.test.ts`
- Lint: `npm run lint`
- DB migrate (dev): `npm run db:migrate`
- Seed demo data: `npm run db:seed` (⚠ recreates demo users with NEW ids —
  active sessions must re-login)

## Tech stack

- Next.js 14 App Router + TypeScript (strict), Tailwind CSS
- next-intl (uz/ru/en) — messages in `messages/{en,ru,uz}.json`
- NextAuth v4 (credentials provider, JWT sessions)
- **Prisma v6** (pinned — do not upgrade casually). SQLite in dev; schema is
  written to be Postgres-compatible (no SQLite-only or Postgres-only constructs)
  so deployment only needs `provider = "postgresql"` + a hosted `DATABASE_URL`.
- Zustand (budget UI state), Recharts (charts), zod (validation), bcryptjs
- Anthropic Claude SDK (`@anthropic-ai/sdk`, model `claude-opus-4-8`) for the
  AI assistant, with graceful degradation when no key is set
- Path alias: `@/*` → `./src/*`

## Architecture

### Two separate root layouts / typographic identities
There is **no** `app/layout.tsx`. Two independent route trees, each with its own
`<html>`:
- `src/app/[locale]/layout.tsx` — the localized app (Geist fonts, Uzbek design
  tokens).
- `src/app/pitch/layout.tsx` — the standalone pitch site (Fraunces serif +
  italics, Inter, JetBrains Mono; ink-navy `#0B1220` dark aesthetic). NOT
  localized.

### Routing / middleware (`src/middleware.ts`)
- `/` is **rewritten** (not redirected) to `/pitch` — the pitch is the front
  door; the URL stays `/`.
- `src/app/[locale]/page.tsx` redirects any locale root (`/en`, `/uz`, `/ru`) to
  `/`. (The old cream marketing landing was retired here.)
- `PROTECTED` segments require a session (redirect to `/{locale}/login`);
  `AUTH_PAGES` bounce logged-in users to the dashboard.
- Matcher excludes `api`, `_next`, `_vercel`, `pitch`, and static files.

### App route groups (`src/app/[locale]/`)
- `(auth)/` — login, register, forgot-password, reset-password
- `(app)/` — dashboard, rates, budget, trust (+ `trust/report`), household,
  summary, help; guarded shell layout mounts `AppNav`, `NotificationBell`, and
  `<AssistantWidget />`.
- `welcome/` — first-run onboarding carousel.

### API routes (`src/app/api/`)
`register`, `forgot-password`, `reset-password`, `clear-session`,
`notifications`, `assistant` (Claude chat), `investor` (pitch inquiries),
`auth/[...nextauth]`.

### Core logic (`src/lib/`)
`rates.ts` (provider comparison math), `trust-score.ts` (score engine),
`budget-data.ts` / `trust-data.ts` (server data loaders), `validators.ts` (zod
schemas — enforces the string-enum fields SQLite can't), `rate-limit.ts`
(in-memory sliding window; `LIMITS` per endpoint), `assistant.ts` (Claude system
prompt + graceful offline guide), `mailer.ts` (email transport — currently a
stub; password reset + investor notify would wire in Resend/SES here),
`notifications.ts`, `milestones.ts`, `categories.ts`, `format.ts`.

### Data model (`prisma/schema.prisma`)
`Household` (owns everything, has `inviteCode`) → `User` (role SENDER/RECEIVER,
`accessRole` ADMIN/VIEWER, `usualSendAmount`), `Transaction`
(REMITTANCE/EXPENSE/INCOME/SAVINGS), `Budget`, `SavingsGoal`,
`TrustScoreSnapshot`, `Notification`, `PasswordResetToken`,
`RemittanceProvider`, and `InvestorInquiry` (pitch leads). **Enum-like fields are
strings** (SQLite has no enums) constrained by zod at the app boundary — keep it
that way.

## Conventions

- Enum-style fields are strings validated in `src/lib/validators.ts`, never
  Prisma enums. When adding a status/type/role, follow this pattern.
- Rate-limit any new public endpoint via `rateLimit(key, LIMITS.x)` and add the
  limit to the `LIMITS` object in `src/lib/rate-limit.ts`.
- All user-facing copy in the localized app goes through next-intl — add keys to
  all three of `messages/{en,ru,uz}.json`. The pitch site is English-only by
  design.
- Server Actions live in `src/app/actions/`; data loaders in `src/lib/*-data.ts`.
- Keep the Prisma schema DB-agnostic (no SQLite- or Postgres-specific features).
- Run `npm test` and the isolated prod build before committing significant
  changes.

## Environment variables (`.env`, see `.env.example`)

- `DATABASE_URL` — `file:./dev.db` locally; hosted Postgres in prod (+ flip the
  schema provider).
- `NEXTAUTH_URL`, `NEXTAUTH_SECRET` (required).
- `ANTHROPIC_API_KEY` (optional) — activates the full Claude assistant; without
  it the assistant runs in built-in guide mode. `ASSISTANT_MODEL` defaults to
  `claude-opus-4-8`.

## Demo credentials

`demo.sender@sendyurt.uz` / `demo.receiver@sendyurt.uz`, password `Demo1234`,
household invite code `DEMOYURT`.

## Git conventions

Commits authored `SendYurt <dev@sendyurt.local>` with trailer
`Co-Authored-By: Claude <noreply@anthropic.com>`. Commit only when asked.

## Deployment (not yet done — needs the user)

Buy a domain; create Vercel + Neon/Supabase (Postgres) + GitHub accounts; switch
the Prisma provider to `postgresql`; set env vars. Optionally set
`ANTHROPIC_API_KEY` for the full assistant, and wire `src/lib/mailer.ts` to a
real transport so password-reset and investor inquiries actually email out.
Verify the placeholder market figures in the pitch before investor distribution.
