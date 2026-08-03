import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The safety proof for "view as user".
 *
 * The feature's whole claim is three sentences: reads follow the target,
 * writes are refused, and the grant is a server-side row rather than a
 * credential. Each of those is asserted here against the real modules — the
 * session chokepoint, the staff guard and the resolver — with only the
 * database, Supabase and the cookie jar faked.
 *
 * If the "writes are refused" cases ever start passing, an operator can act as
 * a customer while the audit trail records the customer as the actor. That is
 * the failure this file exists to catch.
 */

// ── Request state the fakes read ──────────────────────────────────────────
let cookieValue: string | undefined;
/** Who is actually signed in — never changes when impersonating. */
let signedInId = "op_1";

type Row = Record<string, unknown>;
const users: Row[] = [];
const sessions: Row[] = [];

const OPERATOR: Row = {
  id: "op_1",
  email: "ops@sendyurt.uz",
  name: "Dilnoza",
  role: "SENDER",
  householdId: "hh_staff",
  accessRole: "ADMIN",
  adminRole: "ADMIN",
  suspended: false,
  image: null,
};
const TARGET: Row = {
  id: "cust_1",
  email: "aziz@example.uz",
  name: "Aziz",
  role: "RECEIVER",
  householdId: "hh_cust",
  accessRole: "VIEWER",
  adminRole: "USER",
  suspended: false,
  image: null,
};

// ── Module fakes ──────────────────────────────────────────────────────────
// `cache()` is a Next-runtime API; identity is equivalent for a single call,
// and NOT memoizing is what lets each test vary the cookie.
vi.mock("react", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("react");
  return { ...actual, cache: (fn: unknown) => fn };
});
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT:${to}`);
  },
}));
vi.mock("next/headers", () => ({
  cookies: () => ({
    get: (name: string) =>
      name === "sy_view_as" && cookieValue ? { name, value: cookieValue } : undefined,
  }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: () => ({
    auth: { getUser: async () => ({ data: { user: { id: signedInId, email: "x@y.uz" } } }) },
  }),
}));
vi.mock("@/lib/supabase/bridge", () => ({
  bridgeUser: async () => users.find((u) => u.id === signedInId) ?? null,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    impersonationSession: {
      findUnique: async ({ where }: { where: { id: string } }) => {
        const row = sessions.find((s) => s.id === where.id);
        if (!row) return null;
        // Mirrors `include: { target: true }`.
        return { ...row, target: users.find((u) => u.id === row.targetUserId) };
      },
    },
  },
}));

const { getAppSession, getOperatorSession } = await import("@/lib/supabase/app-session");
const { requireUser } = await import("@/lib/session");
const { assertPermission } = await import("@/lib/admin");
const { getActiveImpersonation, isReadOnlyRequest } = await import("@/lib/impersonation");
const { formatCountdown, minutesLeft } = await import("@/lib/countdown");

/** A live grant from op_1 to cust_1, unless overridden. */
function grant(overrides: Row = {}): string {
  const row: Row = {
    id: "sess_1",
    operatorId: "op_1",
    targetUserId: "cust_1",
    reason: "Ticket 412 — savings goal shows the wrong balance",
    startedAt: new Date(Date.now() - 60_000),
    expiresAt: new Date(Date.now() + 20 * 60_000),
    endedAt: null,
    ip: "203.0.113.7",
    ...overrides,
  };
  sessions.push(row);
  return row.id as string;
}

beforeEach(() => {
  users.length = 0;
  users.push({ ...OPERATOR }, { ...TARGET });
  sessions.length = 0;
  cookieValue = undefined;
  signedInId = "op_1";
});

describe("reads follow the target", () => {
  it("requireUser returns the customer's identity and household", async () => {
    cookieValue = grant();
    const user = await requireUser();

    expect(user.id).toBe("cust_1");
    // This is the line that makes every page work without knowing about
    // impersonation: the data loaders are all keyed on it.
    expect(user.householdId).toBe("hh_cust");
    expect(user.impersonating).toMatchObject({
      operatorName: "Dilnoza",
      targetName: "Aziz",
      reason: "Ticket 412 — savings goal shows the wrong balance",
    });
  });

  it("without a grant it returns the signed-in user and a null flag", async () => {
    const user = await requireUser();
    expect(user.id).toBe("op_1");
    expect(user.impersonating).toBeNull();
  });

  it("the operator's own session still resolves to them", async () => {
    cookieValue = grant();
    const session = await getOperatorSession();
    // No credential was minted: the authenticated principal is unchanged.
    expect(session?.user.id).toBe("op_1");
  });
});

describe("writes are refused", () => {
  it("getAppSession throws — the chokepoint every action and API route uses", async () => {
    cookieValue = grant();
    await expect(getAppSession()).rejects.toThrow("read_only_session");
  });

  it("assertPermission throws even for a permission the operator holds", async () => {
    cookieValue = grant();
    // ADMIN genuinely has customer.suspend; being in a view-as session is
    // what refuses it, not the role.
    await expect(assertPermission("customer.suspend")).rejects.toThrow("read_only_session");
  });

  it("both are allowed again once the session ends", async () => {
    const id = grant();
    cookieValue = id;
    await expect(getAppSession()).rejects.toThrow("read_only_session");

    sessions.find((s) => s.id === id)!.endedAt = new Date();
    await expect(getAppSession()).resolves.toMatchObject({ user: { id: "op_1" } });
    await expect(assertPermission("customer.suspend")).resolves.toMatchObject({ adminId: "op_1" });
  });
});

describe("the cookie is a pointer, not a credential", () => {
  it("is rejected when presented by a different operator", async () => {
    users.push({ ...OPERATOR, id: "op_2", name: "Other" });
    cookieValue = grant(); // issued to op_1
    signedInId = "op_2"; // …presented by op_2

    expect(await getActiveImpersonation("op_2")).toBeNull();
    // op_2 is simply themselves — the stolen cookie grants nothing.
    const user = await requireUser();
    expect(user.id).toBe("op_2");
    expect(user.impersonating).toBeNull();
  });

  it("is rejected once expired, without anyone ending it", async () => {
    cookieValue = grant({ expiresAt: new Date(Date.now() - 1_000) });
    expect(await getActiveImpersonation("op_1")).toBeNull();
    await expect(getAppSession()).resolves.toMatchObject({ user: { id: "op_1" } });
  });

  it("is rejected after the grant is ended server-side", async () => {
    cookieValue = grant({ endedAt: new Date() });
    expect(await getActiveImpersonation("op_1")).toBeNull();
  });

  it("resolves to nothing when it names no real grant", async () => {
    cookieValue = "sess_forged";
    expect(await getActiveImpersonation("op_1")).toBeNull();
    await expect(getAppSession()).resolves.toMatchObject({ user: { id: "op_1" } });
  });

  it("stops following a customer who gets suspended mid-session", async () => {
    cookieValue = grant();
    users.find((u) => u.id === "cust_1")!.suspended = true;
    expect(await getActiveImpersonation("op_1")).toBeNull();
  });
});

describe("writes that happen on read", () => {
  it("isReadOnlyRequest reports a live grant, so no Trust snapshot is persisted", async () => {
    cookieValue = grant();
    expect(await isReadOnlyRequest()).toBe(true);
  });

  it("reports false with no cookie, and once the grant lapses", async () => {
    expect(await isReadOnlyRequest()).toBe(false);
    cookieValue = grant({ expiresAt: new Date(Date.now() - 1_000) });
    expect(await isReadOnlyRequest()).toBe(false);
  });
});

describe("the countdown an operator watches", () => {
  it("pads seconds so the width never jumps mid-session", () => {
    expect(formatCountdown(30 * 60)).toBe("30:00");
    expect(formatCountdown(605)).toBe("10:05");
    expect(formatCountdown(59)).toBe("0:59");
    expect(formatCountdown(9)).toBe("0:09");
  });

  it("shows 1:30 draining, not a static \"1 min\"", () => {
    // The point of a countdown is watching it move; rounding to whole minutes
    // leaves it frozen for sixty seconds at a time.
    expect(formatCountdown(90)).toBe("1:30");
    expect(formatCountdown(89)).toBe("1:29");
  });

  it("floors at zero rather than counting into negatives", () => {
    // Clocks drift and a tab can sleep; the banner must never read "-0:07".
    expect(formatCountdown(0)).toBe("0:00");
    expect(formatCountdown(-42)).toBe("0:00");
  });

  it("agrees with minutesLeft at the moment of hand-off", () => {
    // The banner seeds its state from the server's minutesLeft, then switches
    // to its own clock. If the two disagreed the number would visibly jump.
    const expires = new Date(Date.now() + 30 * 60_000);
    expect(minutesLeft(expires)).toBe(30);
    expect(formatCountdown(minutesLeft(expires) * 60)).toBe("30:00");
  });
});
