import type { RemittanceProvider } from "@prisma/client";
import {
  addMinor,
  fromMajor,
  HOME_CURRENCY,
  isCurrencyCode,
  percentOf,
  subMinor,
  toMajor,
  toMinor,
  type CurrencyCode,
  type Minor,
} from "@/lib/money";

/**
 * Sample mid-market rates to UZS, expressed as MAJOR units per major unit
 * ("1 USD = 12 900 UZS"). These are rates, not money — genuinely fractional
 * (KZT) and arbitrary once a live feed is attached — so they stay floats.
 * Clearly labeled in the UI as sample data.
 */
export const MID_MARKET_UZS: Record<string, number> = {
  USD: 12_900,
  EUR: 13_950,
  RUB: 146,
  KZT: 24.1,
};

export const SOURCE_CURRENCIES = Object.keys(MID_MARKET_UZS) as CurrencyCode[];

export interface Quote {
  providerId: string;
  providerName: string;
  slug: string;
  /** Minor units of `currency`. */
  sendAmount: Minor;
  currency: CurrencyCode;
  /** Minor units of `currency`. */
  baseFee: Minor;
  /** A percentage, e.g. 1.5 — not money. */
  percentFee: number;
  /** Minor units of `currency`. */
  totalFees: Minor;
  /** UZS per unit of source currency after the provider's margin. */
  effectiveRate: number;
  midMarketRate: number;
  marginPercent: number;
  /** Minor units of UZS (tiyin) — already rounded, ready to debit. */
  receivedUzs: Minor;
  transferSpeedHours: number;
}

/**
 * What actually lands in Uzbekistan: subtract fees in the source currency,
 * then convert at the provider's margin-adjusted rate. Quotes are sorted by
 * amount received — the number that matters to the family — not by fee.
 */
export function computeQuotes(
  providers: RemittanceProvider[],
  /** Send amount in MINOR units of `currency`. */
  amount: Minor,
  currency: string,
  /** UZS-per-source-currency table; defaults to the static sample rates.
   *  The rate finder passes live rates from `getUzsRates()` (src/lib/fx.ts). */
  rates: Record<string, number> = MID_MARKET_UZS,
): Quote[] {
  if (!isCurrencyCode(currency)) return [];
  const midMarketRate = rates[currency];
  if (!midMarketRate || !Number.isSafeInteger(amount) || amount <= 0) return [];

  const quotes: Quote[] = [];
  for (const p of providers) {
    if (!p.sourceCurrencies.split(",").includes(currency)) continue;

    // baseFee is money (minor units of the source currency); percentFee and
    // the margin are ratios and stay floats.
    const baseFee = toMinor(p.baseFee);
    const percentFee = p.percentFee.toNumber();
    const marginPercent = p.exchangeRateMargin.toNumber();

    // Round the percentage component once, then add integers — so the total
    // fee is exact and can never disagree with what the user is charged.
    const totalFees = addMinor(baseFee, percentOf(amount, percentFee, currency));
    const netSend = subMinor(amount, totalFees);
    if (netSend <= 0) continue; // amount too small for this provider

    const effectiveRate = midMarketRate * (1 - marginPercent / 100);
    // The single money boundary: convert net send at the effective rate and
    // round once, here. Callers get a value ready to debit — no second
    // rounding downstream.
    const receivedUzs = fromMajor(toMajor(netSend, currency) * effectiveRate, HOME_CURRENCY);

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
