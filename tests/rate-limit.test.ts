import { describe, expect, it } from "vitest";
import {
  checkRateLimit,
  clearAttempts,
  rateLimit,
  recordAttempt,
} from "@/lib/rate-limit";

const OPTS = { max: 3, windowMs: 60_000 };
let n = 0;
/** Unique key per test — the limiter store is module-global. */
function key(): string {
  return `test:${Date.now()}:${n++}`;
}

describe("rateLimit (check-and-consume)", () => {
  it("allows up to max attempts, then blocks with a retry hint", () => {
    const k = key();
    expect(rateLimit(k, OPTS).allowed).toBe(true);
    expect(rateLimit(k, OPTS).allowed).toBe(true);
    expect(rateLimit(k, OPTS).allowed).toBe(true);
    const blocked = rateLimit(k, OPTS);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it("isolates keys from each other", () => {
    const a = key();
    const b = key();
    for (let i = 0; i < 3; i++) rateLimit(a, OPTS);
    expect(rateLimit(a, OPTS).allowed).toBe(false);
    expect(rateLimit(b, OPTS).allowed).toBe(true);
  });
});

describe("failure-based counting (login flow)", () => {
  it("peeking never consumes budget", () => {
    const k = key();
    for (let i = 0; i < 10; i++) checkRateLimit(k, OPTS);
    expect(checkRateLimit(k, OPTS).allowed).toBe(true);
  });

  it("blocks after max recorded failures and unblocks after clear", () => {
    const k = key();
    for (let i = 0; i < 3; i++) recordAttempt(k);
    expect(checkRateLimit(k, OPTS).allowed).toBe(false);
    clearAttempts(k);
    expect(checkRateLimit(k, OPTS).allowed).toBe(true);
  });
});
