import { describe, expect, it } from "vitest";
import { Prisma, type RemittanceProvider } from "@prisma/client";
import { computeQuotes, MID_MARKET_UZS } from "@/lib/rates";

function provider(overrides: Partial<Record<string, unknown>> = {}): RemittanceProvider {
  return {
    id: "p1",
    name: "Test Provider",
    slug: "test",
    baseFee: new Prisma.Decimal(0),
    percentFee: new Prisma.Decimal(0),
    exchangeRateMargin: new Prisma.Decimal(0),
    transferSpeedHours: 1,
    sourceCurrencies: "USD,RUB",
    ...overrides,
  } as RemittanceProvider;
}

describe("computeQuotes", () => {
  it("converts at the mid-market rate when there are no fees or margin", () => {
    const [quote] = computeQuotes([provider()], 100, "USD");
    expect(quote.receivedUzs).toBe(100 * MID_MARKET_UZS.USD);
    expect(quote.totalFees).toBe(0);
  });

  it("applies base fee, percent fee and margin exactly", () => {
    const p = provider({
      baseFee: new Prisma.Decimal(4),
      percentFee: new Prisma.Decimal(0.5),
      exchangeRateMargin: new Prisma.Decimal(2.5),
    });
    const [quote] = computeQuotes([p], 500, "USD");
    const expectedFees = 4 + 500 * 0.005; // 6.5
    const expectedRate = MID_MARKET_UZS.USD * 0.975;
    expect(quote.totalFees).toBeCloseTo(expectedFees, 10);
    expect(quote.effectiveRate).toBeCloseTo(expectedRate, 10);
    expect(quote.receivedUzs).toBeCloseTo((500 - expectedFees) * expectedRate, 6);
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
      baseFee: new Prisma.Decimal(2),
      exchangeRateMargin: new Prisma.Decimal(0.5),
    });
    const quotes = computeQuotes([fatMargin, flatFee], 500, "USD");
    expect(quotes[0].slug).toBe("flat");
    expect(quotes[0].receivedUzs).toBeGreaterThan(quotes[1].receivedUzs);
  });

  it("excludes providers that don't support the currency", () => {
    const usdOnly = provider({ id: "u", slug: "u", sourceCurrencies: "USD" });
    expect(computeQuotes([usdOnly], 1000, "RUB")).toHaveLength(0);
  });

  it("drops providers whose fees eat the whole amount", () => {
    const greedy = provider({ baseFee: new Prisma.Decimal(50) });
    expect(computeQuotes([greedy], 30, "USD")).toHaveLength(0);
  });

  it("returns no quotes for unknown currencies or non-positive amounts", () => {
    expect(computeQuotes([provider()], 100, "GBP")).toHaveLength(0);
    expect(computeQuotes([provider()], 0, "USD")).toHaveLength(0);
    expect(computeQuotes([provider()], -5, "USD")).toHaveLength(0);
    expect(computeQuotes([provider()], NaN, "USD")).toHaveLength(0);
  });
});
