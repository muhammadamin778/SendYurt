# SendYurt

A fintech platform for Uzbek labor migrants and their families: compare
remittance routes by what actually arrives home, budget together as one
household, and build a transparent financial Trust Score.

**Three features, one household:**

1. **Rate & Route Finder** — compares 6 remittance providers by *amount
   received in UZS* (fees + exchange-rate margin included), not by the
   advertised fee. Sample rates, clearly labeled; structured for a live
   FX/provider integration.
2. **Family Budget Dashboard** — shared ledger (expenses, income,
   remittances, savings), category budgets with limits, savings goals with
   progress, and a 6-month spend-vs-save chart. Senders abroad and
   receivers at home see the same picture.
3. **Trust Score** — a transparent 0–100 indicator built from transfer
   consistency (40%), amount stability (30%) and savings behavior (30%),
   with the exact numbers behind every factor and concrete tips to improve
   it. Explicitly *not* a credit score.

Fully localized in **Uzbek (Latin), Russian and English**, switchable from
every page. Mobile-first (bottom navigation on phones).

**Design language & depth features:**

- Palette drawn from real Uzbek craft sources: Registan majolica cobalt
  (primary), Bukhara clay terracotta, zardoʻzi gold (accents/milestones),
  warm sand neutrals; **dark mode** uses night-sky indigo, toggleable from
  every header with no flash on load. Girih star-lattice textures, suzani
  vine dividers and iwan-arch card tops used sparingly as accents.
  Type: Manrope (UI) + Lora (display), full Cyrillic.
- Household page (member list + invite management), 12-month remittance
  timeline, quiet achievement milestones, a **printable Trust Score
  report** (`/trust/report`, prints/saves as PDF) presentable to a
  microfinance officer, and a once-per-account onboarding walkthrough.
- Toasts on every action, page transitions, button press feedback,
  Trust Score count-up, optimistic goal contributions — all gated behind
  `prefers-reduced-motion`; every text/surface token pair verified ≥ AA
  contrast in both themes.

## Stack

- Next.js 14 (App Router, React Server Components + Server Actions), TypeScript
- Prisma ORM — SQLite in dev, Postgres-compatible schema for production
- NextAuth v4 (credentials, bcrypt cost 12, JWT sessions), middleware-protected routes
- next-intl (uz / ru / en), Tailwind CSS, Recharts, Zustand, zod

## Quick start

Requires Node 20+.

```bash
npm install
cp .env.example .env       # set NEXTAUTH_SECRET (openssl rand -base64 32)
npx prisma migrate dev     # creates SQLite dev.db and applies migrations
npx prisma db seed         # providers + demo household with 9 months history
npm run dev                # http://localhost:3000
```

### Tests

`npm test` runs the Vitest unit suite (40 tests) covering the trust-score
engine, rate quote math, the rate limiter, validators and helpers.

### Demo logins (seeded, safe to use live on stage)

| Role | Email | Password |
|---|---|---|
| Sender (abroad) | `demo.sender@sendyurt.uz` | `Demo1234` |
| Receiver (Uzbekistan) | `demo.receiver@sendyurt.uz` | `Demo1234` |

Household invite code: `DEMOYURT`. Re-running the seed wipes and rebuilds
the demo household with fresh, current-dated history.

## Deployment (Vercel + Neon/Supabase Postgres)

1. In `prisma/schema.prisma`, change the datasource provider to
   `postgresql` and commit a fresh migration:
   `npx prisma migrate dev --name init-postgres` against your Postgres URL.
   (The schema avoids SQLite-only and Postgres-only constructs, so no model
   changes are needed.)
2. Set Vercel environment variables: `DATABASE_URL`, `NEXTAUTH_URL`
   (the deployment URL), `NEXTAUTH_SECRET`.
3. Build command: `prisma migrate deploy && next build`
   (`prisma generate` already runs on `postinstall`).
4. Seed once from your machine:
   `DATABASE_URL=<prod-url> npx prisma db seed`.

## Architecture notes & deliberate decisions

- **Money is stored as `Decimal`** and converted to `number` only at the
  UI boundary (`src/lib/budget-data.ts`). On SQLite the precision is
  approximate (fine for demo data); on Postgres it is exact.
- **Roles/statuses are strings, not enums** — SQLite doesn't support
  enums. Values are constrained by zod at every entry point
  (`src/lib/validators.ts`).
- **`Budget.amount_spent` is derived, not stored.** The spec listed it as
  a column, but persisting a running total invites drift; spent amounts
  are aggregated live from the transaction ledger per category/period.
- **One `Transaction` ledger** covers remittances, expenses, income and
  savings deposits (a `type` discriminator plus nullable
  sender/receiver/provider columns). This keeps the budget, the trust
  score and a future bank-API import writing to the same audited table.
- **Server Actions own all mutations**, each re-validating the session
  and re-checking household scoping server-side; middleware handles
  route-level auth, pages re-check as defense in depth.
- **Login is enumeration-safe**: a dummy bcrypt compare runs when the
  email doesn't exist, and the forgot-password flow answers identically
  for known and unknown emails.
- **Password reset is real**: single-use, sha256-hashed tokens with a
  1-hour TTL (`PasswordResetToken`), a concurrency-safe claim, and a
  pluggable mail transport (`src/lib/mailer.ts` — logs the link in dev,
  swap in Resend/SES/SMTP for production without touching callers).
- **Auth endpoints are rate limited** (`src/lib/rate-limit.ts`): login
  counts only *failed* attempts (5 per 15 min per account and per IP,
  cleared on success); register, forgot- and reset-password consume per
  request. In-memory store — swap for Redis/Upstash when scaling
  horizontally.
- **Security headers** (X-Frame-Options DENY, nosniff, referrer and
  permissions policies) are set globally in `next.config.mjs`.
- **Trust Score snapshots** are persisted (`TrustScoreSnapshot`) whenever
  the score changes or ages past 24h, giving households an auditable
  history while the number itself is always recomputed from the ledger.

## Known limitations (honest list)

- Exchange rates and provider fees are **sample data** (labeled in the UI).
- Password-reset emails aren't delivered yet — the flow is complete, but
  `src/lib/mailer.ts` needs a real transport (Resend/SES/SMTP) wired in.
- Rate limiting is in-memory (per instance); move to Redis/Upstash for
  multi-instance deployments.
- No CSP header yet (Next inline scripts make a strict CSP non-trivial).
- `next dev` and `next build` share `.next` by default; use
  `NEXT_DIST_DIR=.next-prod npm run build` to build while dev is running.
