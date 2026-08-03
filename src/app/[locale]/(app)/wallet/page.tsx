import { setRequestLocale } from "next-intl/server";
import { requireUser } from "@/lib/session";
import { createServerSupabase } from "@/lib/supabase/server";
import { WalletBoard, type WalletTx } from "@/components/wallet/WalletBoard";

// Per-user wallet data behind auth — never prerender.
export const dynamic = "force-dynamic";

export default async function WalletPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  const user = await requireUser();

  /**
   * The one surface view-as cannot follow.
   *
   * Everything else on this shell reads through Prisma keyed by
   * `user.householdId`, which the session guard has already switched to the
   * target. The wallet does not: it queries Supabase directly, and Supabase
   * scopes those rows by RLS to whoever's JWT is on the request — which is
   * still the *operator*. Rendering it would show the operator their own
   * balance under the customer's name, which is worse than showing nothing:
   * it is a wrong answer that looks like a right one.
   */
  if (user.impersonating) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="rounded-2xl border border-[#e2e8f0] bg-white p-8 text-center">
          <h1 className="text-[18px] font-bold text-[#0f172a]">Wallet is hidden in read-only sessions</h1>
          <p className="mx-auto mt-3 max-w-md text-[14px] leading-relaxed text-[#64748b]">
            Wallet balances are held in a separate ledger that is scoped to the signed-in
            account, so it cannot be viewed on {user.name ?? "this customer"}&rsquo;s behalf.
            Showing it here would display <em>your</em> balance under their name.
          </p>
          <p className="mt-3 text-[13px] text-[#94a3b8]">
            Use the transaction monitor in the admin panel for their payment history.
          </p>
        </div>
      </div>
    );
  }

  // Initial snapshot via the user's own session (RLS returns only their rows).
  const supabase = createServerSupabase();
  let balance = 0;
  let currency = "UZS";
  let tx: WalletTx[] = [];
  try {
    const [{ data: w }, { data: t }] = await Promise.all([
      supabase.from("wallets").select("balance,currency").maybeSingle(),
      supabase.rpc("my_transactions", { limit_count: 50 }),
    ]);
    if (w) {
      balance = Number(w.balance);
      currency = w.currency ?? "UZS";
    }
    if (Array.isArray(t)) tx = t as WalletTx[];
  } catch (e) {
    console.error("wallet initial load failed", e);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <WalletBoard
        locale={locale}
        userEmail={user.email ?? ""}
        initialBalance={balance}
        currency={currency}
        initialTx={tx}
      />
    </div>
  );
}
