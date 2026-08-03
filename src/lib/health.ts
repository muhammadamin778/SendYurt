import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Real dependency health for the admin dashboard.
 *
 * Replaces a hardcoded panel that always claimed "Fiat Gateways: ONLINE /
 * Crypto Bridges: ONLINE / Compliance API: LOCKED" — none of which were
 * measured, and one of which ("Crypto Bridges") described a subsystem this
 * application does not have.
 *
 * Two honesty rules shape this module:
 *
 * 1. **CONFIGURED is not ONLINE.** Holding an API key proves we could call a
 *    service, not that it answers. Checks that only read env say CONFIGURED;
 *    only a check that actually round-trips says ONLINE. A dashboard that
 *    blurs those is worse than no dashboard, because it is trusted.
 * 2. **Nothing here is invented.** A service the app does not integrate does
 *    not get a row.
 *
 * Only the database is round-tripped on render. Reaching out to Stripe or
 * Telegram on every dashboard load would add their latency and rate limits to
 * our own page, so those report configuration state and say so.
 */

export type HealthState = "ONLINE" | "DEGRADED" | "OFFLINE" | "CONFIGURED" | "NOT_CONFIGURED";

export interface DependencyHealth {
  key: string;
  label: string;
  state: HealthState;
  /** One short clause explaining what was actually measured. */
  detail: string;
}

/** Treated as healthy-looking in the UI; the rest render as warnings. */
export const HEALTHY_STATES: HealthState[] = ["ONLINE", "CONFIGURED"];

const DB_TIMEOUT_MS = 2500;

/** Rejects rather than hanging the dashboard on an unreachable dependency. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

/**
 * Round-trips the primary database. This is the one genuine liveness probe on
 * the page — `SELECT 1` is cheap and proves the connection pool works, which
 * is what actually breaks.
 */
async function checkDatabase(): Promise<DependencyHealth> {
  const started = Date.now();
  try {
    await withTimeout(prisma.$queryRaw`SELECT 1`, DB_TIMEOUT_MS);
    const ms = Date.now() - started;
    return {
      key: "database",
      label: "Database",
      // A pool that answers but slowly is the shape of trouble worth seeing
      // before it becomes an outage.
      state: ms > 800 ? "DEGRADED" : "ONLINE",
      detail: `Responded in ${ms}ms`,
    };
  } catch (e) {
    return {
      key: "database",
      label: "Database",
      state: "OFFLINE",
      detail: e instanceof Error && e.message === "timeout" ? "No response in 2.5s" : "Query failed",
    };
  }
}

/** Config-only: presence of the publishable URL the browser client needs. */
function checkSupabase(): DependencyHealth {
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  return {
    key: "supabase",
    label: "Auth & wallet",
    state: configured ? "CONFIGURED" : "NOT_CONFIGURED",
    detail: configured ? "Supabase keys present — not round-tripped here" : "No Supabase URL set",
  };
}

function checkStripe(): DependencyHealth {
  const live = process.env.STRIPE_SECRET_KEY?.startsWith("sk_live");
  const configured = Boolean(process.env.STRIPE_SECRET_KEY);
  return {
    key: "stripe",
    label: "Card payments",
    state: configured ? "CONFIGURED" : "NOT_CONFIGURED",
    detail: configured
      ? `Stripe key present (${live ? "live" : "test"} mode)`
      : "Card funding falls back to stored balance",
  };
}

function checkTelegram(): DependencyHealth {
  const configured = Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_LOG_CHAT_ID);
  return {
    key: "telegram",
    label: "Ops logging",
    state: configured ? "CONFIGURED" : "NOT_CONFIGURED",
    detail: configured ? "Log group wired" : "Events are not being forwarded",
  };
}

function checkAssistant(): DependencyHealth {
  const configured = Boolean(process.env.ANTHROPIC_API_KEY);
  return {
    key: "assistant",
    label: "AI assistant",
    state: configured ? "CONFIGURED" : "NOT_CONFIGURED",
    detail: configured ? "Claude key present" : "Running in built-in guide mode",
  };
}

/**
 * Every dependency, in the order the dashboard shows them — most consequential
 * first, so an outage is read before a missing optional key.
 */
export async function checkDependencies(): Promise<DependencyHealth[]> {
  const database = await checkDatabase();
  return [database, checkSupabase(), checkStripe(), checkTelegram(), checkAssistant()];
}
