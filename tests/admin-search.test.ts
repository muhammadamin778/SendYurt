import { describe, expect, it } from "vitest";
import { looksLikeTransactionId } from "@/lib/admin-search";

/**
 * Regression tests for the admin topbar search.
 *
 * The router sends id-shaped queries to the transaction monitor and everything
 * else to a people search. The original rule counted any 8-character
 * alphanumeric string as an id, which silently broke searching for customers:
 * a great many Uzbek names are exactly eight letters, so looking someone up
 * landed on the transaction monitor with zero results.
 */

describe("looksLikeTransactionId", () => {
  it("does NOT treat eight-letter names as transaction ids", () => {
    // Every one of these is 8 characters and used to misroute.
    for (const name of ["muhammad", "abdullah", "jasurbek", "gaybullo", "shomurod", "dilnoza1"]) {
      expect(looksLikeTransactionId(name), name).toBe(false);
    }
  });

  it("treats ordinary name and email searches as people searches", () => {
    for (const q of ["Jasur", "Alimov", "demo", "jasur@example.uz", "Jasur Alimov", "sardor"]) {
      expect(looksLikeTransactionId(q), q).toBe(false);
    }
  });

  it("recognises a full cuid", () => {
    expect(looksLikeTransactionId("clx3k9f2h0000abcdefghijkl")).toBe(true);
  });

  it("recognises the short form only when the operator kept its marker", () => {
    // This is exactly what the transactions table renders.
    expect(looksLikeTransactionId("#A1B2C3D4-UZ")).toBe(true);
    expect(looksLikeTransactionId("#a1b2c3d4")).toBe(true);
    expect(looksLikeTransactionId("a1b2c3d4-UZ")).toBe(true);
    // …but the bare token is ambiguous with a name, so it is not an id.
    expect(looksLikeTransactionId("a1b2c3d4")).toBe(false);
  });

  it("ignores surrounding whitespace", () => {
    expect(looksLikeTransactionId("  #A1B2C3D4-UZ  ")).toBe(true);
    expect(looksLikeTransactionId("  muhammad  ")).toBe(false);
  });

  it("rejects empty and junk input", () => {
    for (const q of ["", "   ", "#", "-uz", "#-UZ"]) {
      expect(looksLikeTransactionId(q), JSON.stringify(q)).toBe(false);
    }
  });
});
