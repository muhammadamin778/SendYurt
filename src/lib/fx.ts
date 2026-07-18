import { MID_MARKET_UZS, SOURCE_CURRENCIES } from "@/lib/rates";

export interface FxRates {
  /** UZS per 1 unit of each source currency (USD, EUR, RUB, KZT). */
  rates: Record<string, number>;
  /** true if fetched from the live feed, false if the static fallback is used. */
  live: boolean;
  fetchedAt: Date | null;
}

// Process-level cache so navigating between pages (dashboard ↔ rates) never
// re-hits the network. Success is trusted for an hour; a failed lookup is
// remembered only briefly so we retry soon without hammering a down API.
const HOUR = 60 * 60 * 1000;
let cache: { expires: number; data: FxRates } | null = null;

// fawazahmed0's free, keyless, rate-limit-free exchange API
// (github.com/fawazahmed0/exchange-api). USD-based; a jsDelivr primary with
// the project's official Cloudflare-Pages fallback.
const FX_ENDPOINTS = [
  "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.min.json",
  "https://latest.currency-api.pages.dev/v1/currencies/usd.min.json",
];

/**
 * Live mid-market rates to UZS from the fawazahmed0 exchange-api. The feed is
 * USD-based (`{ date, usd: { uzs, eur, rub, kzt, ... } }`), so we derive
 * "UZS per 1 C" for each source currency via the cross rate
 * (UZS per USD) / (C per USD). Falls back to the static MID_MARKET_UZS table
 * when the network is slow or unavailable, so the rate finder never blocks:
 * each request is capped at 2.5s, endpoints are tried in order, and the whole
 * thing is cached in-process for an hour.
 */
export async function getUzsRates(): Promise<FxRates> {
  if (cache && Date.now() < cache.expires) return cache.data;

  for (const url of FX_ENDPOINTS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    try {
      const res = await fetch(url, { next: { revalidate: 3600 }, signal: controller.signal });
      if (!res.ok) throw new Error(`fx http ${res.status}`);
      const data = (await res.json()) as { date?: string; usd?: Record<string, number> };
      const table = data.usd;
      const usdToUzs = table?.uzs;
      if (!table || !usdToUzs) throw new Error("fx: missing UZS rate");

      const rates: Record<string, number> = {};
      for (const c of SOURCE_CURRENCIES) {
        if (c === "USD") {
          rates.USD = usdToUzs;
          continue;
        }
        const perUsd = table[c.toLowerCase()];
        rates[c] = perUsd ? usdToUzs / perUsd : MID_MARKET_UZS[c];
      }
      const result: FxRates = { rates, live: true, fetchedAt: new Date() };
      cache = { expires: Date.now() + HOUR, data: result };
      return result;
    } catch {
      // try the next endpoint
    } finally {
      clearTimeout(timeout);
    }
  }

  const fallback: FxRates = { rates: { ...MID_MARKET_UZS }, live: false, fetchedAt: null };
  cache = { expires: Date.now() + 2 * 60 * 1000, data: fallback };
  return fallback;
}
