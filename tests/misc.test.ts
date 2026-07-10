import { describe, expect, it } from "vitest";
import { generateInviteCode } from "@/lib/invite-code";
import { passwordStrength } from "@/lib/password-strength";
import { isValidPeriod, periodRange, shiftPeriod } from "@/lib/budget-data";
import { formatMoney } from "@/lib/format";

describe("generateInviteCode", () => {
  it("produces 8 chars from the unambiguous alphabet", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateInviteCode();
      expect(code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/);
      // No lookalikes that are painful to read over the phone:
      expect(code).not.toMatch(/[01OIL]/);
    }
  });
});

describe("passwordStrength", () => {
  it("enforces the server minimum: 8+ chars with letter and digit", () => {
    expect(passwordStrength("short1").meetsMinimum).toBe(false);
    expect(passwordStrength("onlyletters").meetsMinimum).toBe(false);
    expect(passwordStrength("12345678").meetsMinimum).toBe(false);
    expect(passwordStrength("abcdefg1").meetsMinimum).toBe(true);
  });

  it("grades strength monotonically", () => {
    expect(passwordStrength("abcdefg1").strength).toBe("weak");
    const fair = passwordStrength("Abcdefg1");
    const strong = passwordStrength("Abcdefg1!xyz");
    expect(["fair", "strong"]).toContain(fair.strength);
    expect(strong.strength).toBe("strong");
  });
});

describe("budget period helpers", () => {
  it("validates YYYY-MM strictly", () => {
    expect(isValidPeriod("2026-07")).toBe(true);
    expect(isValidPeriod("2026-13")).toBe(false);
    expect(isValidPeriod("2026-00")).toBe(false);
    expect(isValidPeriod("2026-7")).toBe(false);
    expect(isValidPeriod("garbage")).toBe(false);
  });

  it("shifts periods across year boundaries", () => {
    expect(shiftPeriod("2026-01", -1)).toBe("2025-12");
    expect(shiftPeriod("2026-12", 1)).toBe("2027-01");
    expect(shiftPeriod("2026-07", -14)).toBe("2025-05");
  });

  it("produces half-open month ranges", () => {
    const { start, end } = periodRange("2026-02");
    expect(start.toISOString()).toBe("2026-02-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-03-01T00:00:00.000Z");
  });
});

describe("formatMoney", () => {
  it("renders UZS without decimals", () => {
    const s = formatMoney(1_234_567.89, "UZS", "en");
    expect(s).toContain("1,234,568");
    expect(s).not.toContain(".89");
  });

  it("falls back gracefully for unknown currency codes", () => {
    expect(() => formatMoney(100, "NOT_A_CODE", "en")).not.toThrow();
  });
});
