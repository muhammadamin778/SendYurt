import { describe, expect, it } from "vitest";
import { maskEmail, maskName, emailFor, nameFor } from "@/lib/mask";
import {
  can,
  homePathFor,
  isStaff,
  permissionsFor,
  PERMISSIONS,
  ROLE_LABELS,
  STAFF_ROLES,
  type Permission,
} from "@/lib/permissions";

/**
 * The full role × permission matrix, written out longhand.
 *
 * Spelling it out rather than deriving it from the implementation is the
 * point: this table IS the product decision, and a diff here should be
 * impossible to make by accident.
 */
const GRANTED: Record<"SUPPORT" | "ADMIN" | "SUPER_ADMIN", Permission[]> = {
  SUPPORT: [
    "customer.view",
    "transaction.view",
    "transaction.confirm",
    "transaction.dispute",
    "ticket.view",
    "ticket.reply",
    "ticket.assign",
    "ticket.resolve",
    "ticket.note.internal",
  ],
  ADMIN: [
    "customer.view",
    "customer.pii.view",
    "customer.suspend",
    "customer.export",
    "customer.impersonate",
    "transaction.view",
    "transaction.confirm",
    "transaction.dispute",
    "transaction.reverse",
    "transaction.export",
    "ticket.view",
    "ticket.reply",
    "ticket.assign",
    "ticket.resolve",
    "ticket.note.internal",
    "settings.view",
  ],
  SUPER_ADMIN: [...PERMISSIONS],
};

describe("permission matrix", () => {
  for (const role of STAFF_ROLES) {
    it(`${role} holds exactly its documented permissions`, () => {
      const granted = new Set(GRANTED[role]);
      // Assert BOTH directions for every permission, so an accidental grant
      // fails just as loudly as an accidental removal.
      for (const permission of PERMISSIONS) {
        expect(can(role, permission), `${role} → ${permission}`).toBe(granted.has(permission));
      }
    });
  }

  it("gives a plain USER nothing at all", () => {
    for (const permission of PERMISSIONS) {
      expect(can("USER", permission)).toBe(false);
    }
    expect(permissionsFor("USER")).toEqual([]);
    expect(isStaff("USER")).toBe(false);
  });

  it("treats an unknown role as having no access", () => {
    // Defensive: adminRole reaches this as a string from the DB.
    for (const permission of PERMISSIONS) {
      expect(can("GARBAGE", permission)).toBe(false);
    }
    expect(isStaff("")).toBe(false);
  });
});

describe("the boundaries that matter", () => {
  it("SUPPORT cannot move money", () => {
    // Reversal credits a card back / decrements a goal — the one transaction
    // action with a financial effect.
    expect(can("SUPPORT", "transaction.reverse")).toBe(false);
    expect(can("ADMIN", "transaction.reverse")).toBe(true);
  });

  it("SUPPORT cannot bulk-export customer data", () => {
    expect(can("SUPPORT", "customer.export")).toBe(false);
    expect(can("SUPPORT", "transaction.export")).toBe(false);
  });

  it("SUPPORT cannot view a customer's account as them", () => {
    // The widest seat does not get the most invasive read. Reconsider only
    // when a grant can be scoped to a specific ticket.
    expect(can("SUPPORT", "customer.impersonate")).toBe(false);
    expect(can("ADMIN", "customer.impersonate")).toBe(true);
  });

  it("SUPPORT cannot see unmasked PII", () => {
    expect(can("SUPPORT", "customer.pii.view")).toBe(false);
  });

  it("SUPPORT cannot reach settings — the case that prompted this work", () => {
    expect(can("SUPPORT", "settings.view")).toBe(false);
    expect(can("SUPPORT", "settings.system.edit")).toBe(false);
  });

  it("only SUPER_ADMIN edits the system or manages staff", () => {
    for (const role of ["SUPPORT", "ADMIN"] as const) {
      expect(can(role, "settings.system.edit")).toBe(false);
      expect(can(role, "staff.manage")).toBe(false);
    }
    expect(can("SUPER_ADMIN", "settings.system.edit")).toBe(true);
    expect(can("SUPER_ADMIN", "staff.manage")).toBe(true);
  });

});

describe("role bundles nest", () => {
  it("ADMIN is a superset of SUPPORT, and SUPER_ADMIN of ADMIN", () => {
    for (const p of permissionsFor("SUPPORT")) expect(can("ADMIN", p)).toBe(true);
    for (const p of permissionsFor("ADMIN")) expect(can("SUPER_ADMIN", p)).toBe(true);
  });

  it("every role has a label", () => {
    for (const role of ["USER", ...STAFF_ROLES] as const) {
      expect(ROLE_LABELS[role]).toBeTruthy();
    }
  });
});

describe("homePathFor", () => {
  it("sends support to its own workspace and ops to the dashboard", () => {
    expect(homePathFor("SUPPORT", "en")).toBe("/en/support-desk");
    expect(homePathFor("ADMIN", "en")).toBe("/en/admin");
    expect(homePathFor("SUPER_ADMIN", "uz")).toBe("/uz/admin");
  });

  it("sends a non-staff user back to the consumer app", () => {
    expect(homePathFor("USER", "ru")).toBe("/ru/dashboard");
  });
});

describe("masking", () => {
  it("keeps the domain but hides the local part", () => {
    expect(maskEmail("jasur@example.uz")).toBe("j•••@example.uz");
    expect(maskEmail("demo.sender@sendyurt.uz")).toBe("d•••@sendyurt.uz");
  });

  it("reveals nothing for a one-character local part or a non-address", () => {
    expect(maskEmail("a@b.com")).toBe("•••@b.com");
    expect(maskEmail("not-an-email")).toBe("•••");
    expect(maskEmail("@nolocal.com")).toBe("•••");
  });

  it("shortens a name to first name plus surname initial", () => {
    expect(maskName("Jasur Alimov")).toBe("Jasur A.");
    expect(maskName("Aziz")).toBe("Aziz");
    expect(maskName("  ")).toBe("—");
  });

  it("only masks when the viewer lacks permission", () => {
    expect(emailFor("jasur@example.uz", true)).toBe("jasur@example.uz");
    expect(emailFor("jasur@example.uz", false)).toBe("j•••@example.uz");
    expect(nameFor("Jasur Alimov", true)).toBe("Jasur Alimov");
    expect(nameFor("Jasur Alimov", false)).toBe("Jasur A.");
  });
});
