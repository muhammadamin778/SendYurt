const INTL_LOCALE: Record<string, string> = {
  uz: "uz-UZ",
  ru: "ru-RU",
  en: "en-US",
};

/** UZS is displayed without decimals; other currencies with two. */
export function formatMoney(amount: number, currency: string, locale: string): string {
  const intl = INTL_LOCALE[locale] ?? "en-US";
  const isUzs = currency === "UZS";
  try {
    return new Intl.NumberFormat(intl, {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: isUzs ? 0 : 2,
    }).format(amount);
  } catch {
    // Unknown currency code — fall back to a plain number.
    return `${new Intl.NumberFormat(intl).format(Math.round(amount))} ${currency}`;
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
