import { z } from "zod";

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

export const rateQuerySchema = z.object({
  amount: z.coerce.number().positive().max(1_000_000),
  sourceCurrency: z.enum(["USD", "RUB", "KZT", "EUR"]),
});

export const expenseSchema = z.object({
  amount: z.coerce.number().positive().max(10_000_000_000),
  category: z.string().min(1).max(40),
  note: z.string().trim().max(200).optional(),
  date: z.coerce.date(),
});

export const incomeSchema = z.object({
  amount: z.coerce.number().positive().max(10_000_000_000),
  note: z.string().trim().max(200).optional(),
  date: z.coerce.date(),
});

export const budgetSchema = z.object({
  category: z.string().min(1).max(40),
  amountAllocated: z.coerce.number().min(0).max(10_000_000_000),
  period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
});

export const savingsGoalSchema = z.object({
  name: z.string().trim().min(2).max(80),
  targetAmount: z.coerce.number().positive().max(10_000_000_000),
  targetDate: z.coerce.date().optional(),
});

export const contributionSchema = z.object({
  goalId: z.string().min(1),
  amount: z.coerce.number().positive().max(10_000_000_000),
});
