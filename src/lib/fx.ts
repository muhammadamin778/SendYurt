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

/**
 * Live mid-market rates to UZS, from exchangerate-api.com — the same provider
 * used by the reference Currency-Converter-App. Keyless "open" endpoint by
 * default; keyed v6 if EXCHANGERATE_API_KEY is set. Falls back to the static
 * MID_MARKET_UZS table when the network is slow or unavailable, so the rate
 * finder never blocks: the request is capped at 2.5s and the whole thing is
 * cached in-process for an hour.
 *
 * The response is based on USD; we derive "UZS per 1 C" for each source
 * currency via the USD cross rate: (UZS per USD) / (C per USD).
 */
export async function getUzsRates(): Promise<FxRates> {
  if (cache && Date.now() < cache.expires) return cache.data;

  const key = process.env.EXCHANGERATE_API_KEY;
  const url = key
    ? `https://v6.exchangerate-api.com/v6/${key}/latest/USD`
    : "https://open.er-api.com/v6/latest/USD";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  try {
    const res = await fetch(url, {
      next: { revalidate: 3600 },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`fx http ${res.status}`);
    const data = (await res.json()) as {
      result?: string;
      rates?: Record<string, number>;
      conversion_rates?: Record<string, number>;
    };
    // keyless "open" endpoint returns `rates`; keyed v6 returns `conversion_rates`.
    const table = key ? data.conversion_rates : data.rates;
    const usdToUzs = table?.UZS;
    if (!table || !usdToUzs) throw new Error("fx: missing UZS rate");

    const rates: Record<string, number> = {};
    for (const c of SOURCE_CURRENCIES) {
      if (c === "USD") {
        rates.USD = usdToUzs;
        continue;
      }
      const perUsd = table[c];
      rates[c] = perUsd ? usdToUzs / perUsd : MID_MARKET_UZS[c];
    }
    const result: FxRates = { rates, live: true, fetchedAt: new Date() };
    cache = { expires: Date.now() + HOUR, data: result };
    return result;
  } catch {
    const fallback: FxRates = { rates: { ...MID_MARKET_UZS }, live: false, fetchedAt: null };
    cache = { expires: Date.now() + 2 * 60 * 1000, data: fallback };
    return fallback;
  } finally {
    clearTimeout(timeout);
  }
}
