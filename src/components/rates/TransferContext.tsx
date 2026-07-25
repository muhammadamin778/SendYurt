"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { evaluateFunding, type FundingDecision } from "@/lib/funding";

export type PlainCard = {
  id: string;
  brand: string;
  last4: string;
  holderName: string;
  /** Stored-value balance in UZS. */
  balance: number;
};

type TransferCtx = {
  cards: PlainCard[];
  /** UZS amount the funding card must cover for this transfer. */
  uzsCost: number;
  /** Selected funding card id, or null when paying from the SendYurt balance. */
  selectedCardId: string | null;
  setSelectedCardId: (id: string | null) => void;
  selectedCard: PlainCard | null;
  /** True when a card is selected but its balance can't cover the transfer. */
  insufficient: boolean;
  /**
   * The funding decision for the current selection — the same rules the server
   * enforces. `blockReason` is null when the transfer may proceed.
   */
  blockReason: Extract<FundingDecision, { ok: false }>["reason"] | null;
  /** Convenience: true when the transfer is allowed to be submitted. */
  canSubmit: boolean;
};

const Ctx = createContext<TransferCtx | null>(null);

/**
 * Shares the chosen funding card between the Payment-method selector (left
 * column) and the Confirm button (right column) on the Review step, so the
 * insufficient-funds guard can be enforced in one place.
 */
export function TransferProvider({
  cards,
  uzsCost,
  children,
}: {
  cards: PlainCard[];
  uzsCost: number;
  children: ReactNode;
}) {
  // Default to the first (default) card when the user has linked any.
  const [selectedCardId, setSelectedCardId] = useState<string | null>(cards[0]?.id ?? null);

  const value = useMemo<TransferCtx>(() => {
    const selectedCard = cards.find((c) => c.id === selectedCardId) ?? null;
    // With no card selected (including the "no linked cards" case) balance is
    // null, which the rules treat as `no_card` — so the Confirm button is
    // blocked instead of silently sending unfunded money.
    const decision = evaluateFunding({ balance: selectedCard?.balance ?? null, cost: uzsCost });
    return {
      cards,
      uzsCost,
      selectedCardId,
      setSelectedCardId,
      selectedCard,
      insufficient: selectedCard != null && selectedCard.balance < uzsCost,
      blockReason: decision.ok ? null : decision.reason,
      canSubmit: decision.ok,
    };
  }, [cards, uzsCost, selectedCardId]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTransfer(): TransferCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTransfer must be used within a TransferProvider");
  return ctx;
}
