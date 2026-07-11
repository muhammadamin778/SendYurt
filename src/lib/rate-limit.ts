/**
 * In-memory sliding-window rate limiter.
 *
 * Suitable for a single instance (local dev, one Vercel region with low
 * traffic). For horizontal scale, swap the store for Redis/Upstash — the
 * call sites only depend on `rateLimit()`.
 */

interface Bucket {
  timestamps: number[];
}

const store = new Map<string, Bucket>();

// Opportunistic cleanup so the map doesn't grow unbounded.
let lastSweep = Date.now();
function sweep(now: number, windowMs: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  const keys = Array.from(store.keys());
  for (const key of keys) {
    const bucket = store.get(key);
    if (!bucket || bucket.timestamps.every((t) => now - t > windowMs)) {
      store.delete(key);
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the oldest attempt leaves the window (when blocked). */
  retryAfterSeconds: number;
}

/** Check whether the key is over budget, without consuming an attempt. */
export function checkRateLimit(
  key: string,
  { max, windowMs }: { max: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();
  sweep(now, windowMs);

  const bucket = store.get(key) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);
  store.set(key, bucket);

  if (bucket.timestamps.length >= max) {
    const oldest = Math.min(...bucket.timestamps);
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((oldest + windowMs - now) / 1000),
    };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

/** Record one attempt against the key (used for failure-based counting). */
export function recordAttempt(key: string): void {
  const bucket = store.get(key) ?? { timestamps: [] };
  bucket.timestamps.push(Date.now());
  store.set(key, bucket);
}

/** Forget a key, e.g. after a successful login. */
export function clearAttempts(key: string): void {
  store.delete(key);
}

/** Check and consume in one step — for endpoints where every request counts. */
export function rateLimit(
  key: string,
  opts: { max: number; windowMs: number },
): RateLimitResult {
  const result = checkRateLimit(key, opts);
  if (result.allowed) recordAttempt(key);
  return result;
}

/** Best-effort client IP for keying; falls back to "unknown" behind no proxy. */
export function clientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unknown";
}

export const LIMITS = {
  login: { max: 5, windowMs: 15 * 60 * 1000 },
  register: { max: 5, windowMs: 60 * 60 * 1000 },
  forgotPassword: { max: 3, windowMs: 60 * 60 * 1000 },
  resetPassword: { max: 5, windowMs: 15 * 60 * 1000 },
  assistant: { max: 30, windowMs: 60 * 60 * 1000 },
} as const;
