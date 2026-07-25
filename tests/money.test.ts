import { describe, expect, it } from "vitest";
import {
  addMinor,
  convert,
  fromMajor,
  parseMoney,
  percentOf,
  subMinor,
  sumMinor,
  toBigInt,
  toMajor,
  toMajorString,
  toMinor,
  type Minor,
} from "@/lib/money";

const m = (n: number) => n as Minor;

describe("parseMoney", () => {
  it("parses decimals exactly where float maths would not", () => {
    // Number("400.55") * 100 === 40054.999999999993 — the bug this prevents.
    expect(parseMoney("400.55", "USD")).toBe(40055);
    expect(parseMoney("1.10", "USD")).toBe(110);
    expect(parseMoney("0.07", "USD")).toBe(7);
  });

  it("keeps 0.1 + 0.2 exact", () => {
    const a = parseMoney("0.1", "USD")!;
    const b = parseMoney("0.2", "USD")!;
    expect(addMinor(a, b)).toBe(30);
    expect(toMajorString(addMinor(a, b), "USD")).toBe("0.30");
  });

  it("pads short fractions and handles missing parts", () => {
    expect(parseMoney("5.1", "USD")).toBe(510);
    expect(parseMoney("5", "USD")).toBe(500);
    expect(parseMoney(".5", "USD")).toBe(50);
    expect(parseMoney("0", "USD")).toBe(0);
  });

  it("accepts the comma separator and spaced thousands, as the forms do", () => {
    expect(parseMoney("400,55", "USD")).toBe(40055);
    expect(parseMoney("1 234 567", "UZS")).toBe(123456700);
  });

  it("rejects more precision than the currency has", () => {
    expect(parseMoney("1.234", "USD")).toBeNull();
    expect(parseMoney("1.005", "UZS")).toBeNull();
  });

  it("rejects junk", () => {
    for (const bad of ["", "   ", "abc", "1.2.3", "1e5", ".", "-", "12abc"]) {
      expect(parseMoney(bad, "USD")).toBeNull();
    }
  });

  it("handles negatives", () => {
    expect(parseMoney("-12.34", "USD")).toBe(-1234);
  });

  it("accepts a number input without going through float scaling", () => {
    expect(parseMoney(400.55, "USD")).toBe(40055);
  });
});

describe("toMinor", () => {
  it("converts bigint from the database", () => {
    expect(toMinor(123456789n)).toBe(123456789);
  });

  it("refuses values past MAX_SAFE_INTEGER instead of truncating", () => {
    expect(() => toMinor(BigInt(Number.MAX_SAFE_INTEGER) + 1n)).toThrow(RangeError);
    expect(() => toMinor(1.5)).toThrow(RangeError);
  });

  it("round-trips through bigint for a Prisma write", () => {
    expect(toBigInt(m(4200))).toBe(4200n);
  });
});

describe("fromMajor", () => {
  // 1.125 and 0.625 are exactly representable in binary floating point, so
  // scaling them lands on a true .5 and genuinely exercises the tie rule.
  // (A literal like 1.005 could not: it is really 1.00499999999999989, so
  // it rounds DOWN — which is exactly why user input goes through
  // parseMoney's string path and never through here.)
  it("rounds ties away from zero", () => {
    expect(fromMajor(1.125, "USD")).toBe(113); // 112.5 → 113
    expect(fromMajor(0.625, "USD")).toBe(63); // 62.5 → 63
    expect(fromMajor(-1.125, "USD")).toBe(-113); // Math.round alone gives -112
  });

  it("rounds non-ties normally", () => {
    expect(fromMajor(1.004, "USD")).toBe(100);
    expect(fromMajor(1.006, "USD")).toBe(101);
  });

  it("rejects non-finite input rather than producing NaN money", () => {
    expect(() => fromMajor(Number.NaN, "USD")).toThrow(RangeError);
    expect(() => fromMajor(Number.POSITIVE_INFINITY, "UZS")).toThrow(RangeError);
  });
});

describe("convert", () => {
  it("converts at a major-per-major rate, rounding once", () => {
    // 100.00 USD at 12 900 UZS/USD = 1 290 000 UZS = 129 000 000 tiyin
    expect(convert(m(10_000), "USD", "UZS", 12_900)).toBe(129_000_000);
  });

  it("handles fractional rates", () => {
    // 10.00 KZT at 24.1 UZS/KZT = 241 UZS
    expect(convert(m(1_000), "KZT", "UZS", 24.1)).toBe(24_100);
  });
});

describe("percentOf", () => {
  it("applies a percentage and rounds once", () => {
    expect(percentOf(m(50_000), 0.5, "USD")).toBe(250); // 0.5% of 500.00 = 2.50
    expect(percentOf(m(10_000), 1.5, "USD")).toBe(150);
  });
});

describe("arithmetic", () => {
  it("adds, subtracts and sums exactly", () => {
    expect(addMinor(m(1), m(2), m(3))).toBe(6);
    expect(subMinor(m(500), m(125))).toBe(375);
    expect(sumMinor([m(10), m(20), m(30)])).toBe(60);
    expect(sumMinor([])).toBe(0);
  });
});

describe("display conversion", () => {
  it("converts to major units for rendering", () => {
    expect(toMajor(m(129_000_000), "UZS")).toBe(1_290_000);
    expect(toMajor(m(40_055), "USD")).toBe(400.55);
  });

  it("renders a major-unit string without float artefacts", () => {
    expect(toMajorString(m(40_055), "USD")).toBe("400.55");
    expect(toMajorString(m(5), "USD")).toBe("0.05");
    expect(toMajorString(m(-1_234), "USD")).toBe("-12.34");
  });
});
