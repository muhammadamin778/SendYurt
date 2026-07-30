import { describe, expect, it, vi } from "vitest";

/**
 * What an audit entry has to capture.
 *
 * "Something changed" is a note; "SUPER_ADMIN moved this user SUPPORT → ADMIN
 * from this address at this time" is evidence. These assert the typed columns
 * are actually populated, because a trail that only says *what* action ran is
 * the thing this work exists to replace.
 */

vi.mock("@/lib/telegram", () => ({ sendTelegramLog: async () => {} }));

const written: Record<string, unknown>[] = [];
const fakeDb = {
  auditLog: {
    create: async ({ data }: { data: Record<string, unknown> }) => {
      written.push(data);
      return data;
    },
  },
};

const { AUDIT_ACTIONS, clientIpFrom, logAudit } = await import("@/lib/audit");

describe("logAudit", () => {
  it("records the actor's tier, the diff, and the origin", async () => {
    written.length = 0;
    await logAudit(fakeDb as never, {
      action: "ROLE_CHANGE",
      adminId: "staff_1",
      role: "SUPER_ADMIN",
      targetUserId: "u1",
      targetType: "User",
      before: { adminRole: "SUPPORT" },
      after: { adminRole: "ADMIN" },
      ip: "203.0.113.7",
    });

    expect(written).toHaveLength(1);
    expect(written[0]).toMatchObject({
      action: "ROLE_CHANGE",
      adminId: "staff_1",
      role: "SUPER_ADMIN",
      targetUserId: "u1",
      before: { adminRole: "SUPPORT" },
      after: { adminRole: "ADMIN" },
      ip: "203.0.113.7",
    });
  });

  it("writes a row even when only the required fields are given", async () => {
    written.length = 0;
    await logAudit(fakeDb as never, { action: "DATA_EXPORT", adminId: "staff_1" });
    expect(written).toHaveLength(1);
    // Optional fields become explicit nulls rather than being omitted, so a
    // query for "entries with no recorded origin" is answerable.
    expect(written[0]).toMatchObject({ role: null, ip: null, targetUserId: null });
  });
});

describe("clientIpFrom", () => {
  it("takes the first entry of x-forwarded-for — the client, not the proxies", () => {
    const h = new Headers({ "x-forwarded-for": "203.0.113.7, 70.41.3.18, 150.172.238.178" });
    expect(clientIpFrom(h)).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip", () => {
    expect(clientIpFrom(new Headers({ "x-real-ip": "198.51.100.4" }))).toBe("198.51.100.4");
  });

  it("returns null when the request carries neither", () => {
    expect(clientIpFrom(new Headers())).toBeNull();
    // An empty header must not become an empty-string "address".
    expect(clientIpFrom(new Headers({ "x-forwarded-for": "" }))).toBeNull();
  });
});

describe("AUDIT_ACTIONS", () => {
  it("is a value, so the viewer's filter can be driven by it", () => {
    // If this were only a type, a new action could silently become
    // un-filterable in the audit viewer.
    expect(AUDIT_ACTIONS).toContain("ROLE_CHANGE");
    expect(AUDIT_ACTIONS).toContain("TRANSACTION_REVERSE");
    expect(AUDIT_ACTIONS).toContain("DATA_EXPORT");
  });

  it("has no duplicates", () => {
    expect(new Set(AUDIT_ACTIONS).size).toBe(AUDIT_ACTIONS.length);
  });
});
