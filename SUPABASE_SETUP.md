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
SUPABASE_SERVICE_ROLE_KEY=<from Supabase → Project Settings → API → service_role secret>
```

(The existing `DATABASE_URL` / Neon and `NEXTAUTH_*` vars stay as they are.)
The publishable key is safe to expose to the browser. **`SUPABASE_SERVICE_ROLE_KEY`
must never be `NEXT_PUBLIC_`** — it grants full DB access and is used only in
trusted server code (`src/lib/supabase/admin.ts`) for the admin panel's activity
feed and auth-user listing. Add it to `.env` (local) **and** Vercel. Until it is
set, the admin activity tables render an "add the key" notice instead of data.

## 2. Redirect URLs (needed for email links + Google)

Supabase → **Authentication → URL Configuration**:

- **Site URL**: your app origin (e.g. `https://send-yurt.vercel.app`, or
  `http://localhost:3000` for local).
- **Redirect URLs** — add every origin you use, with the callback path:
  ```
  http://localhost:3000/auth/callback
  https://send-yurt.vercel.app/auth/callback
  ```
  The app sends confirmation-email and OAuth users to `/auth/callback`, which
  exchanges the code for a session (`src/app/auth/callback/route.ts`).

## 3. Email verification

The register form uses the standard `supabase.auth.signUp` flow and adapts to
your Email settings (Authentication → **Providers → Email**):

- **Confirm email = ON** → the user gets a verification link; the form shows a
  "check your email" notice, and clicking the link lands on `/auth/callback`
  and signs them in.
- **Confirm email = OFF** → sign-up returns a session immediately (no email).

⚠️ **Email delivery:** Supabase's *built-in* email sender is capped at a few
messages per hour and returns `over_email_send_rate_limit` when exhausted (this
was the "email verification not working" symptom). For reliable delivery,
configure **custom SMTP** under Authentication → Emails (e.g. Resend, SendGrid,
Postmark — Resend has a free tier and takes ~3 minutes). Until SMTP is set up,
either keep sign-up volume tiny or turn **Confirm email OFF**.

## 4. Google sign-in ("Continue with Google")

The button is wired (`supabase.auth.signInWithOAuth({ provider: 'google' })`).
To enable it:

1. **Google Cloud Console** → APIs & Services → Credentials → *Create OAuth
   client ID* → Web application. Add the authorized redirect URI:
   ```
   https://iseuyrgyiybnugrybxfr.supabase.co/auth/v1/callback
   ```
   Copy the **Client ID** and **Client Secret**.
2. **Supabase** → Authentication → **Providers → Google** → enable, paste the
   Client ID + Secret, save.
3. Make sure your app origins are in the Redirect URLs list (section 2).

That's it — the button then redirects to Google and back to `/auth/callback`.

## 5. Database objects (already applied via migrations)

- `profiles`, `wallets`, `transactions` tables — RLS: users read only their own
  rows; all money movement is via RPC only (no direct table writes).
- Trigger `on_auth_user_created` → creates a `profile` + `wallet` (balance 0) for
  every new auth user.
- `app_signup(email, password, …)` — legacy no-email sign-up path (kept in the
  DB but no longer called; the app now uses the standard email-verification flow).
- `transfer_funds(recipient_email, amount, note)` — atomic: checks funds, debits
  sender, credits recipient, logs the transaction, and rolls the whole thing back
  on insufficient funds or an unknown recipient.
- `deposit_funds(amount)` — demo top-up that credits the caller's own wallet.
- `my_transactions(limit)` — the caller's ledger with counterparty names resolved.
- Realtime is enabled on `wallets` + `transactions` so the UI updates live.

## 6. Demo accounts

`demo.sender@sendyurt.uz` / `demo.receiver@sendyurt.uz` (password `Demo1234`)
exist as confirmed Supabase Auth users. The sender wallet is pre-funded so
transfers can be tried immediately. The landing-page **Demo** button signs into
the sender account.

## 7. Try it

Log in → **Wallet** (sidebar) → top up or send money to another account's email.
Balance and history update in real time; sending more than your balance or to an
unknown email is safely rejected.
