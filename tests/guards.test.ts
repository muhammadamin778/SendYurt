import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminRole } from "@prisma/client";

/**
 * The security proof.
 *
 * Every privileged server action is an addressable POST endpoint: it can be
 * invoked directly, without ever rendering the panel that hides its button.
 * So "the button isn't shown" is NOT what protects it — `assertPermission()`
 * inside the action is. These tests call each action with a SUPPORT session
 * and assert it is refused.
 *
 * If one of these ever starts passing for SUPPORT, a support seat has quietly
 * gained the ability to move money or export customer data.
 */

// The role the fake session reports; each test sets it before calling.
let currentRole: AdminRole = "SUPPORT";
let suspended = false;

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
// `requireStaff` is wrapped in React's `cache()`, which only exists inside the
// Next runtime; identity is equivalent for a single call.
vi.mock("react", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("react");
  return { ...actual, cache: (fn: unknown) => fn };
});
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT:${to}`);
  },
}));
// audit.ts → telegram.ts imports "server-only", unresolvable outside Next.
vi.mock("@/lib/telegram", () => ({ sendTelegramLog: async () => {} }));
const fakeSession = async () => ({
  user: { id: "staff_1" },
  db: { id: "staff_1", email: "s@x.uz", name: "Staff", adminRole: currentRole, suspended },
});
vi.mock("@/lib/supabase/app-session", () => ({
  getAppSession: fakeSession,
  // The staff guards read the operator's own session, so view-as can never
  // change whose permissions are being checked.
  getOperatorSession: fakeSession,
}));
// No view-as session in these tests — that path has its own suite.
vi.mock("@/lib/impersonation", () => ({
  getActiveImpersonation: async () => null,
  READ_ONLY_ERROR: "read_only_session",
}));

// Any DB call reaching Prisma means the guard did NOT stop the action — fail loudly.
const boom = () => {
  throw new Error("REACHED THE DATABASE — the permission guard did not block this");
};
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: boom,
    user: { findUnique: boom, findMany: boom, count: boom, update: boom },
    transaction: { findUnique: boom, findMany: boom },
    auditLog: { create: boom },
  },
}));
vi.mock("@/lib/prisma-read", () => ({
  readPrisma: {
    user: { findMany: boom },
    transaction: { findMany: boom, groupBy: boom },
  },
}));

const { setStaffRole, setUserSuspended } = await import("@/app/actions/admin");
const { exportUsersCsv, exportOperationsReport } = await import("@/app/actions/admin-export");
const { transitionTransaction } = await import("@/app/actions/transaction-ops");
const { assertPermission } = await import("@/lib/admin");

beforeEach(() => {
  currentRole = "SUPPORT";
  suspended = false;
});

describe("SUPPORT is refused by every privileged action", () => {
  it("cannot assign staff tiers", async () => {
    for (const role of ["SUPPORT", "ADMIN", "SUPER_ADMIN"]) {
      await expect(setStaffRole({ userId: "u1", role })).resolves.toEqual({
        ok: false,
        error: "forbidden",
      });
    }
  });

  it("cannot suspend an account", async () => {
    await expect(setUserSuspended({ userId: "u1", suspended: true })).resolves.toEqual({
      ok: false,
      error: "forbidden",
    });
  });

  it("cannot bulk-export customers or the ledger", async () => {
    await expect(exportUsersCsv("all")).resolves.toEqual({ ok: false, error: "forbidden" });
    await expect(exportOperationsReport()).resolves.toEqual({ ok: false, error: "forbidden" });
  });

  it("cannot reverse a transaction — the money boundary", async () => {
    // Each event carries its own valid reason codes, so use a real one —
    // otherwise the request fails validation and never reaches the guard.
    for (const [event, reasonCode] of [
      ["REVERSE", "DUPLICATE"],
      ["RESOLVE_UPHELD", "FRAUD"],
    ]) {
      await expect(
        transitionTransaction({ transactionId: "t1", event, reasonCode }),
      ).resolves.toEqual({ ok: false, error: "forbidden" });
    }
  });
});

describe("SUPPORT can still do its job", () => {
  it("is allowed past the guard for confirm and dispute", async () => {
    // These reach the DB, which the fake refuses — proving the *guard* passed.
    // Anything other than "forbidden" means authorization allowed it through.
    for (const [event, reasonCode] of [
      ["CONFIRM", "PROVIDER_CONFIRMED"],
      ["DISPUTE", "NOT_RECEIVED"],
    ]) {
      const res = await transitionTransaction({ transactionId: "t1", event, reasonCode });
      expect(res).not.toEqual({ ok: false, error: "forbidden" });
    }
  });
});

describe("ADMIN and SUPER_ADMIN boundaries", () => {
  it("ADMIN may reverse and export, but not manage staff", async () => {
    currentRole = "ADMIN";
    const reverse = await transitionTransaction({
      transactionId: "t1",
      event: "REVERSE",
      reasonCode: "DUPLICATE",
    });
    expect(reverse).not.toEqual({ ok: false, error: "forbidden" });

    await expect(setStaffRole({ userId: "u1", role: "ADMIN" })).resolves.toEqual({
      ok: false,
      error: "forbidden",
    });
  });

  it("SUPER_ADMIN may assign staff tiers", async () => {
    currentRole = "SUPER_ADMIN";
    const res = await setStaffRole({ userId: "u1", role: "SUPPORT" });
    expect(res).not.toEqual({ ok: false, error: "forbidden" });
  });

  it("nobody can change their own tier — no self-promotion, no self-lockout", async () => {
    currentRole = "SUPER_ADMIN";
    await expect(setStaffRole({ userId: "staff_1", role: "USER" })).resolves.toEqual({
      ok: false,
      error: "self",
    });
  });
});

describe("assertPermission", () => {
  it("throws forbidden for a missing permission and unauthorized for no session", async () => {
    currentRole = "SUPPORT";
    await expect(assertPermission("settings.system.edit")).rejects.toThrow("forbidden");
    await expect(assertPermission("ticket.view")).resolves.toMatchObject({ adminId: "staff_1" });
  });

  it("refuses a suspended staff member regardless of role", async () => {
    // Suspension is a kill switch that outranks the role.
    currentRole = "SUPER_ADMIN";
    suspended = true;
    await expect(assertPermission("staff.manage")).rejects.toThrow("forbidden");
  });

  it("refuses a plain USER", async () => {
    currentRole = "USER";
    await expect(assertPermission("customer.view")).rejects.toThrow("forbidden");
  });
});
