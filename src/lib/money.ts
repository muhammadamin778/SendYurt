/**
 * Money primitives.
 *
 * Money is NEVER a float. Every monetary amount in the app is an integer count
 * of the currency's minor unit (tiyin for UZS, cents for USD/EUR, kopecks for
 * RUB/KZT) carried alongside an explicit currency code. `0.1 + 0.2` problems
 * cannot occur if no amount is ever a fraction.
 *
 * Layering:
 *  • At rest    — Postgres `BIGINT` via Prisma `BigInt` (exact, no overflow).
 *  • In the app — the branded `Minor` number below. `bigint` is not JSON-
 *    serialisable and cannot cross the server→client boundary in the App
 *    Router, so it is converted here, with an assertion that the value fits
 *    inside `Number.MAX_SAFE_INTEGER`. Integer arithmetic under 2^53 is exact.
 *  • On screen  — converted to major units at the very last step, for `Intl`
 *    only. Never convert back.
 *
 * The brand is deliberate: `formatMoney(amount: Minor, …)` will not accept a
 * raw `number`, so the compiler flags every site that hasn't been migrated
 * instead of letting a wrong-by-100x value render silently.
 */

/**
 * Supported currencies and their ISO 4217 minor-unit exponents.
 *
 * All five happen to be 2 today, but the exponent is looked up rather than
 * hardcoded as `100` so adding a 0-decimal (JPY) or 3-decimal (KWD) currency
 * is a change to this table and nothing else.
 *
 * Note UZS: the minor unit (tiyin) is exponent 2 per ISO, even though prices
 * are quoted in whole so'm — which is why `formatMoney` still *displays* UZS
 * with no decimals. Storage precision and display precision are separate.
 */
export const CURRENCIES = {
  UZS: { exponent: 2 },
  USD: { exponent: 2 },
  EUR: { exponent: 2 },
  RUB: { exponent: 2 },
  KZT: { exponent: 2 },
} as const;

export type CurrencyCode = keyof typeof CURRENCIES;

/** The app's home currency — what every balance and budget is denominated in. */
export const HOME_CURRENCY: CurrencyCode = "UZS";

export function isCurrencyCode(value: string): value is CurrencyCode {
  return Object.prototype.hasOwnProperty.call(CURRENCIES, value);
}

/** Minor units per major unit, e.g. 100 for a 2-decimal currency. */
export function minorPerMajor(currency: CurrencyCode): number {
  return 10 ** CURRENCIES[currency].exponent;
}

export function exponentOf(currency: CurrencyCode): number {
  return CURRENCIES[currency].exponent;
}

/**
 * An integer count of a currency's minor unit. Branded so a plain `number`
 * can't be passed where money is expected — that mistake is a 100x error.
 */
export type Minor = number & { readonly __brand: "MinorUnits" };

/** Zero, for reducers and defaults. */
export const ZERO = 0 as Minor;

/**
 * Brand a value already known to be an integer count of minor units — the
 * Prisma `BigInt` read path, and nowhere else.
 *
 * Throws rather than silently truncating: past 2^53 integer arithmetic in JS
 * stops being exact, and a wrong balance must never be quietly produced.
 */
export function toMinor(value: bigint | number): Minor {
  if (typeof value === "bigint") {
    if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < -BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new RangeError(`Money value ${value} exceeds MAX_SAFE_INTEGER; handle it as bigint`);
    }
    return Number(value) as Minor;
  }
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`Money value ${value} is not a safe integer`);
  }
  return value as Minor;
}

/** Back to `bigint` for a Prisma write. */
export function toBigInt(amount: Minor): bigint {
  return BigInt(amount);
}

/**
 * Major units, for display and for rate arithmetic ONLY. The result is a
 * float — never store it, never compare balances with it.
 */
export function toMajor(amount: Minor, currency: CurrencyCode): number {
  return amount / minorPerMajor(currency);
}

/**
 * Convert a COMPUTED major-unit float into minor units, rounding ties away
 * from zero — the single rounding rule for the whole app.
 *
 * `Math.round` alone is not symmetric for negatives (`Math.round(-0.5)` is
 * `-0`), so magnitude is rounded and the sign reapplied.
 *
 * Use this only for results of arithmetic (an FX conversion, a percentage
 * fee). Do NOT use it on user input: a typed "1.005" is really the float
 * 1.00499999999999989 and would round DOWN, quietly losing a cent. Parse
 * user input with `parseMoney`, which never touches a float.
 */
export function fromMajor(value: number, currency: CurrencyCode): Minor {
  if (!Number.isFinite(value)) {
    throw new RangeError(`Cannot convert non-finite value ${value} to money`);
  }
  const scaled = value * minorPerMajor(currency);
  const rounded = Math.sign(scaled) * Math.round(Math.abs(scaled));
  return toMinor(rounded === 0 ? 0 : rounded);
}

/**
 * Convert between currencies at a major-per-major rate (what an FX feed
 * quotes: "1 USD = 12900 UZS"). Rounds once, at the destination.
 */
export function convert(
  amount: Minor,
  from: CurrencyCode,
  to: CurrencyCode,
  rateMajorPerMajor: number,
): Minor {
  return fromMajor(toMajor(amount, from) * rateMajorPerMajor, to);
}

/**
 * Apply a percentage (e.g. `1.5` for 1.5%) to a money amount, rounding once.
 * Used for provider percentage fees.
 */
export function percentOf(amount: Minor, percent: number, currency: CurrencyCode): Minor {
  return fromMajor((toMajor(amount, currency) * percent) / 100, currency);
}

// ── Arithmetic ────────────────────────────────────────────────────────────
// Plain `a + b` on branded numbers widens back to `number`, so these keep the
// brand intact. All exact: integer maths below 2^53.

export function addMinor(...amounts: Minor[]): Minor {
  return toMinor(amounts.reduce<number>((sum, a) => sum + a, 0));
}

export function subMinor(a: Minor, b: Minor): Minor {
  return toMinor(a - b);
}

export function sumMinor(amounts: Iterable<Minor>): Minor {
  let total = 0;
  for (const a of amounts) total += a;
  return toMinor(total);
}

export function negateMinor(a: Minor): Minor {
  return toMinor(-a);
}

// ── Parsing ───────────────────────────────────────────────────────────────

/**
 * Parse user input (major units) into minor units — EXACTLY.
 *
 * `Number("400.55") * 100` yields 40054.999999999993, so the naive route
 * silently loses a cent. This splits the string on the decimal separator and
 * assembles the integer itself, so no float is ever involved.
 *
 * Accepts what the existing forms accept: a `,` or `.` decimal separator, and
 * spaces / NBSP as thousands separators. Rejects more decimal places than the
 * currency has, rather than rounding away money the user typed.
 *
 * Returns `null` for anything unparseable — callers decide the error message.
 */
export function parseMoney(input: string | number, currency: CurrencyCode): Minor | null {
  const raw = typeof input === "number" ? String(input) : input;
  const cleaned = raw
    .replace(/[\s  ]/g, "")
    .replace(",", ".")
    .trim();
  if (cleaned === "") return null;

  const match = /^(-)?(\d*)(?:\.(\d*))?$/.exec(cleaned);
  if (!match) return null;

  const [, sign, whole = "", fraction = ""] = match;
  // Reject "." / "-" with no digits at all.
  if (whole === "" && fraction === "") return null;

  const exponent = exponentOf(currency);
  if (fraction.length > exponent) return null; // more precision than exists

  const padded = fraction.padEnd(exponent, "0");
  const digits = `${whole || "0"}${padded}`;

  // Guard before Number(): a very long digit string would lose precision.
  const value = Number(digits);
  if (!Number.isSafeInteger(value)) return null;

  return toMinor(sign === "-" ? -value : value);
}

/**
 * Coerce a value handed back by a charting library into `Minor`.
 *
 * Recharts passes data values and axis ticks through as `number | string`,
 * and interpolated ticks can be fractional, so this rounds rather than
 * throwing the way `toMinor` does.
 *
 * DISPLAY ONLY — never use it to produce a value that gets stored.
 */
export function asMinorDisplay(value: unknown): Minor {
  const n = Number(value);
  return (Number.isFinite(n) ? Math.round(n) : 0) as Minor;
}

/**
 * Plain-number rendering of an amount in major units, for embedding in
 * strings where `Intl` currency formatting isn't wanted. Display only.
 */
export function toMajorString(amount: Minor, currency: CurrencyCode): string {
  const exponent = exponentOf(currency);
  const negative = amount < 0;
  const digits = String(Math.abs(amount)).padStart(exponent + 1, "0");
  const whole = digits.slice(0, digits.length - exponent);
  const fraction = exponent > 0 ? `.${digits.slice(digits.length - exponent)}` : "";
  return `${negative ? "-" : ""}${whole}${fraction}`;
}
