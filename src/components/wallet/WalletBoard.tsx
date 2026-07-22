"use client";

import { clsx } from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatMoney } from "@/lib/format";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { toast } from "@/components/ui/toast";

export interface WalletTx {
  id: string;
  created_at: string;
  amount: number;
  currency: string;
  note: string | null;
  status: string;
  direction: "sent" | "received" | "deposit";
  counterparty_email: string | null;
  counterparty_name: string | null;
}

interface WalletBoardProps {
  locale: string;
  userEmail: string;
  initialBalance: number;
  currency: string;
  initialTx: WalletTx[];
}

// Maps a raised Postgres exception message to a friendly line.
function transferError(msg: string): string {
  if (/INSUFFICIENT_FUNDS/.test(msg)) return "You don't have enough balance for that transfer.";
  if (/RECIPIENT_NOT_FOUND/.test(msg)) return "No SendYurt account was found for that email.";
  if (/SELF_TRANSFER/.test(msg)) return "You can't send money to your own account.";
  if (/INVALID_AMOUNT/.test(msg)) return "Enter an amount greater than zero.";
  if (/RECIPIENT_WALLET_MISSING|SENDER_WALLET_MISSING/.test(msg)) return "That account doesn't have a wallet yet.";
  return msg || "Transfer failed. Please try again.";
}

function Icon({ d, className = "h-5 w-5" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function WalletBoard({ locale, userEmail, initialBalance, currency, initialTx }: WalletBoardProps) {
  const supabaseRef = useRef<ReturnType<typeof createBrowserSupabase>>();
  if (!supabaseRef.current) supabaseRef.current = createBrowserSupabase();
  const supabase = supabaseRef.current;

  const [balance, setBalance] = useState(initialBalance);
  const [tx, setTx] = useState<WalletTx[]>(initialTx);

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [topping, setTopping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-pull the wallet balance + enriched ledger. Called on mount signals and
  // whenever a realtime change lands.
  const refetch = useCallback(async () => {
    const [{ data: w }, { data: t }] = await Promise.all([
      supabase.from("wallets").select("balance,currency").maybeSingle(),
      supabase.rpc("my_transactions", { limit_count: 50 }),
    ]);
    if (w) setBalance(Number(w.balance));
    if (Array.isArray(t)) setTx(t as WalletTx[]);
  }, [supabase]);

  // Live updates: any change to my wallet or a transfer I'm part of triggers a
  // refresh. RLS ensures I only receive my own rows.
  useEffect(() => {
    const channel = supabase
      .channel("wallet-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "wallets" }, () => refetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, () => refetch())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, refetch]);

  async function onTransfer(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const value = Number(amount);
    if (!recipient.trim() || !Number.isFinite(value) || value <= 0) {
      setError("Enter a recipient email and an amount greater than zero.");
      return;
    }
    setSending(true);
    const { data, error: rpcError } = await supabase.rpc("transfer_funds", {
      recipient_email: recipient.trim(),
      transfer_amount: value,
      transfer_note: note.trim() || null,
    });
    setSending(false);
    if (rpcError) {
      setError(transferError(rpcError.message));
      return;
    }
    const newBalance = data && typeof data === "object" && "new_balance" in data ? Number((data as { new_balance: number }).new_balance) : null;
    if (newBalance != null) setBalance(newBalance);
    setRecipient("");
    setAmount("");
    setNote("");
    toast(`Sent ${formatMoney(value, currency, locale)} to ${recipient.trim()}.`);
    void refetch();
  }

  async function onTopUp(value: number) {
    setError(null);
    setTopping(true);
    const { data, error: rpcError } = await supabase.rpc("deposit_funds", { deposit_amount: value });
    setTopping(false);
    if (rpcError) {
      setError(rpcError.message || "Top-up failed.");
      return;
    }
    const newBalance = data && typeof data === "object" && "new_balance" in data ? Number((data as { new_balance: number }).new_balance) : null;
    if (newBalance != null) setBalance(newBalance);
    toast(`Added ${formatMoney(value, currency, locale)} to your wallet.`);
    void refetch();
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Balance + top-up */}
      <div className="lg:col-span-1 space-y-6">
        <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#0a7c53] to-[#065f3e] p-6 text-white shadow-[0_10px_30px_-12px_rgba(10,124,83,0.6)]">
          <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <p className="text-[13px] font-medium uppercase tracking-wider text-white/70">Wallet balance</p>
          <p className="mt-2 font-sans text-[34px] font-bold tabular-nums">{formatMoney(balance, currency, locale)}</p>
          <p className="mt-4 text-[12px] text-white/70">Your pay-in address</p>
          <p className="text-[14px] font-semibold">{userEmail}</p>
        </div>

        <div className="bank-card p-5">
          <h3 className="text-[15px] font-bold text-[#0f172a]">Quick top-up</h3>
          <p className="mt-1 text-[13px] text-[#64748b]">Add demo funds to your wallet to try transfers.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {[50000, 100000, 500000].map((v) => (
              <button
                key={v}
                type="button"
                disabled={topping}
                onClick={() => onTopUp(v)}
                className="rounded-xl border border-[#e2e8f0] px-3.5 py-2 text-[13px] font-semibold text-[#0a7c53] transition-colors hover:bg-[#0a7c53]/[0.06] disabled:opacity-60"
              >
                + {formatMoney(v, currency, locale)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Send money + history */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bank-card p-6">
          <h3 className="flex items-center gap-2 text-[16px] font-bold text-[#0f172a]">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#0a7c53]/10 text-[#0a7c53]">
              <Icon d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </span>
            Send money
          </h3>

          {error && (
            <p role="alert" className="mt-4 rounded-xl border border-[#fecaca] bg-[#fef2f2] px-3.5 py-2.5 text-[13px] font-medium text-[#b91c1c]">
              {error}
            </p>
          )}

          <form onSubmit={onTransfer} className="mt-4 space-y-4">
            <div>
              <label htmlFor="w-recipient" className="mb-1.5 block text-[13px] font-medium text-[#45464d]">Recipient email</label>
              <input
                id="w-recipient"
                type="email"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="name@example.uz"
                autoComplete="off"
                className="bank-input"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="w-amount" className="mb-1.5 block text-[13px] font-medium text-[#45464d]">Amount ({currency})</label>
                <input
                  id="w-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="bank-input tabular-nums"
                />
              </div>
              <div>
                <label htmlFor="w-note" className="mb-1.5 block text-[13px] font-medium text-[#45464d]">Note (optional)</label>
                <input
                  id="w-note"
                  type="text"
                  maxLength={80}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="For groceries"
                  className="bank-input"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={sending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0a7c53] py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-[#0a7c53]/25 transition-all hover:bg-[#065f3e] active:scale-[0.98] disabled:opacity-60"
            >
              {sending ? (
                <svg viewBox="0 0 24 24" className="h-5 w-5 animate-spin" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 3a9 9 0 109 9" strokeLinecap="round" /></svg>
              ) : (
                <>Send transfer <Icon d="M5 12h14M13 6l6 6-6 6" className="h-5 w-5" /></>
              )}
            </button>
          </form>
        </div>

        <div className="bank-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#eef2f7] px-6 py-4">
            <h3 className="text-[16px] font-bold text-[#0f172a]">Transaction history</h3>
            <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#64748b]">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#0a7c53]" /> Live
            </span>
          </div>
          <ul className="divide-y divide-[#eef2f7]">
            {tx.length === 0 && (
              <li className="px-6 py-10 text-center text-[14px] text-[#64748b]">No transactions yet. Send a transfer or top up to get started.</li>
            )}
            {tx.map((t) => {
              const incoming = t.direction !== "sent";
              const who =
                t.direction === "deposit"
                  ? "Wallet top-up"
                  : `${incoming ? "From" : "To"} ${t.counterparty_name || t.counterparty_email || "unknown"}`;
              return (
                <li key={t.id} className="flex items-center gap-4 px-6 py-4">
                  <span className={clsx("grid h-10 w-10 shrink-0 place-items-center rounded-full", incoming ? "bg-[#0a7c53]/10 text-[#0a7c53]" : "bg-[#fee2e2] text-[#b91c1c]")}>
                    <Icon d={incoming ? "M12 19V5M6 13l6 6 6-6" : "M12 5v14M18 11l-6-6-6 6"} className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-[#0f172a]">{who}</p>
                    <p className="truncate text-[12px] text-[#64748b]">
                      {new Intl.DateTimeFormat(locale === "uz" ? "uz-UZ" : locale === "ru" ? "ru-RU" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(t.created_at))}
                      {t.note ? ` · ${t.note}` : ""}
                    </p>
                  </div>
                  <p className={clsx("shrink-0 text-[15px] font-bold tabular-nums", incoming ? "text-[#0a7c53]" : "text-[#0f172a]")}>
                    {incoming ? "+" : "−"}
                    {formatMoney(Number(t.amount), t.currency || currency, locale)}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
