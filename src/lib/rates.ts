import type { RemittanceProvider } from "@prisma/client";

/**
 * Sample mid-market rates to UZS. Clearly labeled in the UI as sample
 * data — a live FX feed replaces this table when the integration lands.
 */
export const MID_MARKET_UZS: Record<string, number> = {
  USD: 12_900,
  EUR: 13_950,
  RUB: 146,
  KZT: 24.1,
};

export const SOURCE_CURRENCIES = Object.keys(MID_MARKET_UZS) as Array<
  keyof typeof MID_MARKET_UZS
>;

export interface Quote {
  providerId: string;
  providerName: string;
  slug: string;
  sendAmount: number;
  currency: string;
  baseFee: number;
  percentFee: number;
  totalFees: number;
  /** UZS per unit of source currency after the provider's margin. */
  effectiveRate: number;
  midMarketRate: number;
  marginPercent: number;
  receivedUzs: number;
  transferSpeedHours: number;
}

/**
 * What actually lands in Uzbekistan: subtract fees in the source currency,
 * then convert at the provider's margin-adjusted rate. Quotes are sorted by
 * amount received — the number that matters to the family — not by fee.
 */
export function computeQuotes(
  providers: RemittanceProvider[],
  amount: number,
  currency: string,
): Quote[] {
  const midMarketRate = MID_MARKET_UZS[currency];
  if (!midMarketRate || !Number.isFinite(amount) || amount <= 0) return [];

  const quotes: Quote[] = [];
  for (const p of providers) {
    if (!p.sourceCurrencies.split(",").includes(currency)) continue;

    const baseFee = p.baseFee.toNumber();
    const percentFee = p.percentFee.toNumber();
    const marginPercent = p.exchangeRateMargin.toNumber();

    const totalFees = baseFee + (amount * percentFee) / 100;
    const netSend = amount - totalFees;
    if (netSend <= 0) continue; // amount too small for this provider

    const effectiveRate = midMarketRate * (1 - marginPercent / 100);
    const receivedUzs = netSend * effectiveRate;

    quotes.push({
      providerId: p.id,
      providerName: p.name,
      slug: p.slug,
      sendAmount: amount,
      currency,
      baseFee,
      percentFee,
      totalFees,
      effectiveRate,
      midMarketRate,
      marginPercent,
      receivedUzs,
      transferSpeedHours: p.transferSpeedHours,
    });
  }

  return quotes.sort((a, b) => b.receivedUzs - a.receivedUzs);
}
