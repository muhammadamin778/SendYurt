"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

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
    return {
      cards,
      uzsCost,
      selectedCardId,
      setSelectedCardId,
      selectedCard,
      insufficient: selectedCard != null && selectedCard.balance < uzsCost,
    };
  }, [cards, uzsCost, selectedCardId]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTransfer(): TransferCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTransfer must be used within a TransferProvider");
  return ctx;
}
