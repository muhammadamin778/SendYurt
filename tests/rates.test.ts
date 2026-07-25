import { describe, expect, it } from "vitest";
import { Prisma, type RemittanceProvider } from "@prisma/client";
import { parseMoney, type Minor } from "@/lib/money";
import { computeQuotes, MID_MARKET_UZS } from "@/lib/rates";

/** Major-unit literal → minor units, for readable test amounts. */
const usd = (major: string) => parseMoney(major, "USD")!;
const uzs = (major: string) => parseMoney(major, "UZS")!;

function provider(overrides: Partial<Record<string, unknown>> = {}): RemittanceProvider {
  return {
    id: "p1",
    name: "Test Provider",
    slug: "test",
    // baseFee is money → minor units (bigint). percentFee and the margin are
    // ratios and stay Decimal.
    baseFee: 0n,
    percentFee: new Prisma.Decimal(0),
    exchangeRateMargin: new Prisma.Decimal(0),
    transferSpeedHours: 1,
    sourceCurrencies: "USD,RUB",
    ...overrides,
  } as RemittanceProvider;
}

describe("computeQuotes", () => {
  it("converts at the mid-market rate when there are no fees or margin", () => {
    const [quote] = computeQuotes([provider()], usd("100"), "USD");
    // 100 USD × 12 900 = 1 290 000 UZS, in tiyin. Exact integer equality —
    // no toBeCloseTo needed now that money is never a float.
    expect(quote.receivedUzs).toBe(uzs(String(100 * MID_MARKET_UZS.USD)));
    expect(quote.totalFees).toBe(0);
  });

  it("applies base fee, percent fee and margin exactly", () => {
    const p = provider({
      baseFee: BigInt(usd("4")),
      percentFee: new Prisma.Decimal(0.5),
      exchangeRateMargin: new Prisma.Decimal(2.5),
    });
    const [quote] = computeQuotes([p], usd("500"), "USD");

    // 4.00 flat + 0.5% of 500.00 = 4.00 + 2.50 = 6.50 USD, exactly.
    expect(quote.totalFees).toBe(usd("6.50"));
    expect(quote.effectiveRate).toBeCloseTo(MID_MARKET_UZS.USD * 0.975, 10);

    // (500.00 − 6.50) × 12 577.5 = 6 206 001.75 UZS → rounds to 6 206 001.75,
    // i.e. 620 600 175 tiyin. Asserted exactly.
    const netMajor = 500 - 6.5;
    const expectedUzsMajor = netMajor * (MID_MARKET_UZS.USD * 0.975);
    expect(quote.receivedUzs).toBe(Math.round(expectedUzsMajor * 100));
  });

  it("sorts by amount received, not by lowest fee", () => {
    // Zero-fee provider with a fat margin loses to a flat-fee provider
    // with a thin margin at this amount.
    const fatMargin = provider({
      id: "fat",
      slug: "fat",
      exchangeRateMargin: new Prisma.Decimal(3),
    });
    const flatFee = provider({
      id: "flat",
      slug: "flat",
      baseFee: BigInt(usd("2")),
      exchangeRateMargin: new Prisma.Decimal(0.5),
    });
    const quotes = computeQuotes([fatMargin, flatFee], usd("500"), "USD");
    expect(quotes[0].slug).toBe("flat");
    expect(quotes[0].receivedUzs).toBeGreaterThan(quotes[1].receivedUzs);
  });

  it("excludes providers that don't support the currency", () => {
    const usdOnly = provider({ id: "u", slug: "u", sourceCurrencies: "USD" });
    expect(computeQuotes([usdOnly], usd("1000"), "RUB")).toHaveLength(0);
  });

  it("drops providers whose fees eat the whole amount", () => {
    const greedy = provider({ baseFee: BigInt(usd("50")) });
    expect(computeQuotes([greedy], usd("30"), "USD")).toHaveLength(0);
  });

  it("returns no quotes for unknown currencies or non-positive amounts", () => {
    expect(computeQuotes([provider()], usd("100"), "GBP")).toHaveLength(0);
    expect(computeQuotes([provider()], 0 as Minor, "USD")).toHaveLength(0);
    expect(computeQuotes([provider()], -500 as Minor, "USD")).toHaveLength(0);
    expect(computeQuotes([provider()], Number.NaN as Minor, "USD")).toHaveLength(0);
  });

  it("rejects a non-integer amount rather than silently rounding it", () => {
    expect(computeQuotes([provider()], 100.5 as Minor, "USD")).toHaveLength(0);
  });
});
