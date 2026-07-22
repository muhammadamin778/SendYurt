# Supabase auth + wallet — setup & deploy checklist

SendYurt's authentication and the peer-to-peer wallet run on **Supabase**
(project `iseuyrgyiybnugrybxfr`). The legacy household / budget / trust /
remittance features keep running on the existing Neon + Prisma database; the
two are linked by email through `src/lib/supabase/bridge.ts`.

## 1. Environment variables

Local dev already has these in `.env`. **You must add them to Vercel**
(Project → Settings → Environment Variables) or production auth will fail:

```
NEXT_PUBLIC_SUPABASE_URL=https://iseuyrgyiybnugrybxfr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xns7Vtxbr0hqeE21U59M8Q_khDkx1RF
```

(The existing `DATABASE_URL` / Neon and `NEXTAUTH_*` vars stay as they are.)
The publishable key is safe to expose to the browser.

## 2. Supabase dashboard settings

- **Email confirmations** (Authentication → Sign In / Providers → Email):
  - Leave **on** → new sign-ups must click a link in their inbox before they
    can log in (the register form shows a "check your email" message).
  - Turn **off** → sign-ups are logged in immediately (smoother for a demo).
- **Google OAuth** (deferred): to enable the "Continue with Google" flow later,
  add your Google client ID/secret under Authentication → Providers → Google
  and set the redirect URL. The button isn't wired yet.

## 3. Database objects (already applied via migrations)

- `profiles`, `wallets`, `transactions` tables — RLS: users read only their own
  rows; all money movement is via RPC only (no direct table writes).
- Trigger `on_auth_user_created` → creates a `profile` + `wallet` (balance 0) for
  every new auth user.
- `transfer_funds(recipient_email, amount, note)` — atomic: checks funds, debits
  sender, credits recipient, logs the transaction, and rolls the whole thing back
  on insufficient funds or an unknown recipient.
- `deposit_funds(amount)` — demo top-up that credits the caller's own wallet.
- `my_transactions(limit)` — the caller's ledger with counterparty names resolved.
- Realtime is enabled on `wallets` + `transactions` so the UI updates live.

## 4. Demo accounts

`demo.sender@sendyurt.uz` / `demo.receiver@sendyurt.uz` (password `Demo1234`)
exist as confirmed Supabase Auth users. The sender wallet is pre-funded so
transfers can be tried immediately. The landing-page **Demo** button signs into
the sender account.

## 5. Try it

Log in → **Wallet** (sidebar) → top up or send money to another account's email.
Balance and history update in real time; sending more than your balance or to an
unknown email is safely rejected.
