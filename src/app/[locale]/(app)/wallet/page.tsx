import { setRequestLocale } from "next-intl/server";
import { requireUser } from "@/lib/session";
import { createServerSupabase } from "@/lib/supabase/server";
import { WalletBoard, type WalletTx } from "@/components/wallet/WalletBoard";

// Per-user wallet data behind auth — never prerender.
export const dynamic = "force-dynamic";

export default async function WalletPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  const user = await requireUser();

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
      <p className="mb-6 text-[14px] text-[#64748b]">Send money instantly to any SendYurt account by email — funds move in real time.</p>
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
