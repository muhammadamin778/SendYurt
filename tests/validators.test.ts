import { describe, expect, it } from "vitest";
import {
  budgetSchema,
  expenseSchema,
  rateQuerySchema,
  registerSchema,
} from "@/lib/validators";

const baseRegister = {
  name: "Aziz Karimov",
  email: "  Aziz@Example.COM ",
  password: "GoodPass1",
  role: "SENDER",
};

describe("registerSchema", () => {
  it("normalizes email to trimmed lowercase", () => {
    const parsed = registerSchema.parse({
      ...baseRegister,
      householdMode: "create",
      householdName: "Karimov family",
    });
    expect(parsed.email).toBe("aziz@example.com");
  });

  it("requires a household name when creating", () => {
    const result = registerSchema.safeParse({
      ...baseRegister,
      householdMode: "create",
    });
    expect(result.success).toBe(false);
  });

  it("requires an invite code when joining, and uppercases it", () => {
    expect(
      registerSchema.safeParse({ ...baseRegister, householdMode: "join" }).success,
    ).toBe(false);
    const parsed = registerSchema.parse({
      ...baseRegister,
      householdMode: "join",
      inviteCode: "demoyurt",
    });
    expect(parsed.inviteCode).toBe("DEMOYURT");
  });

  it("rejects weak passwords and unknown roles", () => {
    expect(
      registerSchema.safeParse({
        ...baseRegister,
        password: "weak",
        householdMode: "create",
        householdName: "X Y",
      }).success,
    ).toBe(false);
    expect(
      registerSchema.safeParse({
        ...baseRegister,
        role: "ADMIN",
        householdMode: "create",
        householdName: "X Y",
      }).success,
    ).toBe(false);
  });
});

describe("rateQuerySchema", () => {
  it("coerces amounts and enforces bounds", () => {
    expect(rateQuerySchema.parse({ amount: "400", sourceCurrency: "USD" }).amount).toBe(400);
    expect(rateQuerySchema.safeParse({ amount: "-1", sourceCurrency: "USD" }).success).toBe(false);
    expect(rateQuerySchema.safeParse({ amount: "2000000", sourceCurrency: "USD" }).success).toBe(false);
    expect(rateQuerySchema.safeParse({ amount: "100", sourceCurrency: "GBP" }).success).toBe(false);
  });
});

describe("expenseSchema", () => {
  it("accepts a normal expense and coerces the date", () => {
    const parsed = expenseSchema.parse({
      amount: 250000,
      category: "health",
      date: "2026-07-10",
    });
    expect(parsed.date).toBeInstanceOf(Date);
  });

  it("rejects zero and negative amounts", () => {
    expect(
      expenseSchema.safeParse({ amount: 0, category: "food", date: "2026-07-10" }).success,
    ).toBe(false);
    expect(
      expenseSchema.safeParse({ amount: -10, category: "food", date: "2026-07-10" }).success,
    ).toBe(false);
  });
});

describe("budgetSchema", () => {
  it("enforces the YYYY-MM period format", () => {
    expect(
      budgetSchema.safeParse({ category: "food", amountAllocated: 100, period: "2026-07" }).success,
    ).toBe(true);
    expect(
      budgetSchema.safeParse({ category: "food", amountAllocated: 100, period: "2026-7" }).success,
    ).toBe(false);
  });
});
