import { z } from "zod";
import { HOME_CURRENCY, parseMoney, type CurrencyCode, type Minor } from "@/lib/money";
import { SOURCE_CURRENCIES } from "@/lib/rates";

/**
 * A monetary field. Accepts what the forms send (a string like "400.55" or
 * "1 234,50", or a number) and yields exact integer MINOR units — never a
 * float. Bounds are given in MAJOR units for readability and converted once.
 *
 * `parseMoney` rejects more decimal places than the currency has, so a user
 * cannot silently lose sub-unit precision.
 */
function moneyField(opts: {
  currency: CurrencyCode;
  /** Inclusive, in major units. */
  maxMajor: number;
  /** Defaults to "must be > 0"; pass 0 to allow zero. */
  minMajor?: number;
}) {
  const { currency, maxMajor, minMajor } = opts;
  return z.union([z.string(), z.number()]).transform((raw, ctx) => {
    const parsed = parseMoney(raw, currency);
    if (parsed === null) {
      ctx.addIssue({ code: "custom", message: "invalid_amount" });
      return z.NEVER;
    }
    const min = parseMoney(String(minMajor ?? 0), currency)!;
    const max = parseMoney(String(maxMajor), currency)!;
    if (minMajor === undefined ? parsed <= min : parsed < min) {
      ctx.addIssue({ code: "custom", message: "amount_too_small" });
      return z.NEVER;
    }
    if (parsed > max) {
      ctx.addIssue({ code: "custom", message: "amount_too_large" });
      return z.NEVER;
    }
    return parsed as Minor;
  });
}

/** UZS amounts (budgets, expenses, goals) share the same generous cap. */
const uzsAmount = (minMajor?: number) =>
  moneyField({ currency: HOME_CURRENCY, maxMajor: 10_000_000_000, minMajor });

// Derived from the single currency registry so the list can't drift.
const sourceCurrencyEnum = z.enum(
  SOURCE_CURRENCIES as [CurrencyCode, ...CurrencyCode[]],
);

const MAX_SEND_MAJOR = 1_000_000;

/**
 * Parse a send-side amount against the currency chosen in the SAME object —
 * a send amount is denominated in its own currency, so it can't be parsed by
 * a field-level rule that doesn't know which one was picked.
 */
function parseSendAmount(
  raw: string | number,
  currency: CurrencyCode,
  ctx: z.RefinementCtx,
): Minor | typeof z.NEVER {
  const parsed = parseMoney(raw, currency);
  if (parsed === null) {
    ctx.addIssue({ code: "custom", message: "invalid_amount", path: ["amount"] });
    return z.NEVER;
  }
  if (parsed <= 0) {
    ctx.addIssue({ code: "custom", message: "amount_too_small", path: ["amount"] });
    return z.NEVER;
  }
  if (parsed > parseMoney(String(MAX_SEND_MAJOR), currency)!) {
    ctx.addIssue({ code: "custom", message: "amount_too_large", path: ["amount"] });
    return z.NEVER;
  }
  return parsed;
}

export const ROLES = ["SENDER", "RECEIVER"] as const;
export type Role = (typeof ROLES)[number];

export const TRANSACTION_TYPES = ["REMITTANCE", "EXPENSE", "INCOME", "SAVINGS"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const TRANSACTION_STATUSES = ["PENDING", "COMPLETED", "FAILED"] as const;

export const LOCALES = ["uz", "ru", "en"] as const;

// Minimum 8 chars with at least one letter and one digit. Communicated in the
// UI; enforced on both client and server.
export const passwordSchema = z
  .string()
  .min(8)
  .max(128)
  .regex(/[a-zA-Z]/, "letter")
  .regex(/[0-9]/, "digit");

export const registerSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().toLowerCase().email().max(254),
    password: passwordSchema,
    role: z.enum(ROLES),
    householdMode: z.enum(["create", "join"]),
    householdName: z.string().trim().min(2).max(80).optional(),
    inviteCode: z.string().trim().toUpperCase().length(8).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.householdMode === "create" && !data.householdName) {
      ctx.addIssue({ code: "custom", path: ["householdName"], message: "required" });
    }
    if (data.householdMode === "join" && !data.inviteCode) {
      ctx.addIssue({ code: "custom", path: ["inviteCode"], message: "required" });
    }
  });

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(32).max(128),
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export const rateQuerySchema = z
  .object({
    amount: z.union([z.string(), z.number()]),
    sourceCurrency: sourceCurrencyEnum,
  })
  .transform((v, ctx) => ({
    amount: parseSendAmount(v.amount, v.sourceCurrency, ctx),
    sourceCurrency: v.sourceCurrency,
  }));

/**
 * Optional client-supplied idempotency key. The client generates one per
 * submission attempt and reuses it across retries, so a double click or a
 * network retry replays the same key and the server returns the original
 * record instead of creating a second one.
 */
export const idempotencyKey = z.string().trim().min(8).max(64).optional();

export const expenseSchema = z.object({
  idempotencyKey,
  amount: uzsAmount(),
  category: z.string().min(1).max(40),
  note: z.string().trim().max(200).optional(),
  date: z.coerce.date(),
});

export const incomeSchema = z.object({
  idempotencyKey,
  amount: uzsAmount(),
  note: z.string().trim().max(200).optional(),
  date: z.coerce.date(),
});

export const budgetSchema = z.object({
  category: z.string().min(1).max(40),
  amountAllocated: uzsAmount(0),
  period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
});

export const savingsGoalSchema = z.object({
  name: z.string().trim().min(2).max(80),
  targetAmount: uzsAmount(),
  targetDate: z.coerce.date().optional(),
});

export const remittanceSchema = z
  .object({
    providerId: z.string().min(1),
    idempotencyKey,
    amount: z.union([z.string(), z.number()]),
    currency: sourceCurrencyEnum,
    // Optional at the schema level so the action can return the precise
    // `card_required` error rather than a generic validation failure.
    cardId: z.string().min(1).optional(),
  })
  .transform((v, ctx) => ({
    providerId: v.providerId,
    idempotencyKey: v.idempotencyKey,
    amount: parseSendAmount(v.amount, v.currency, ctx),
    currency: v.currency,
    cardId: v.cardId,
  }));

export const CARD_BRANDS = ["visa", "mc", "humo", "uzcard", "card"] as const;

// Adding a funding card. The full number is accepted for validation but only
// the last four digits are ever persisted (see the addCard action / Card model).
export const addCardSchema = z.object({
  holderName: z.string().trim().min(2).max(80),
  cardNumber: z.preprocess(
    (v) => String(v ?? "").replace(/\D/g, ""),
    z.string().min(12).max(19),
  ),
  expiry: z.string().trim().regex(/^(0[1-9]|1[0-2])\/\d{2}$/),
  brand: z.enum(CARD_BRANDS).default("card"),
});

export const contributionSchema = z.object({
  idempotencyKey,
  goalId: z.string().min(1),
  amount: uzsAmount(),
  note: z.string().trim().max(120).optional(),
});

export const updateGoalSchema = z.object({
  goalId: z.string().min(1),
  name: z.string().trim().min(2).max(80),
  targetAmount: uzsAmount(),
  targetDate: z.coerce.date().optional(),
});
