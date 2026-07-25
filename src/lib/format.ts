import { isCurrencyCode, toMajor, type Minor } from "@/lib/money";

const INTL_LOCALE: Record<string, string> = {
  uz: "uz-UZ",
  ru: "ru-RU",
  en: "en-US",
};

/**
 * Render money for display.
 *
 * Takes MINOR units (see src/lib/money.ts) and converts to major units here,
 * at the very last step — the only place that division is allowed. The
 * branded `Minor` parameter means a raw number won't compile, so a site that
 * hasn't been migrated is a build error rather than a silent 100x mistake.
 *
 * UZS is displayed without decimals (nobody quotes tiyin); other currencies
 * with two. That is unchanged — storage precision and display precision are
 * separate concerns.
 */
export function formatMoney(amount: Minor, currency: string, locale: string): string {
  const intl = INTL_LOCALE[locale] ?? "en-US";
  const isUzs = currency === "UZS";
  // An unknown code has no exponent to divide by; fall through to the
  // catch below, which renders the raw figure rather than a wrong one.
  const major = isCurrencyCode(currency) ? toMajor(amount, currency) : null;
  try {
    if (major === null) throw new RangeError("unsupported currency");
    return new Intl.NumberFormat(intl, {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: isUzs ? 0 : 2,
    }).format(major);
  } catch {
    // Unknown currency code — fall back to a plain number.
    return `${new Intl.NumberFormat(intl).format(Math.round(major ?? amount))} ${currency}`;
  }
}

export function formatNumber(value: number, locale: string, digits = 0): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale] ?? "en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale] ?? "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatMonth(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale] ?? "en-US", {
    month: "short",
  }).format(date);
}
