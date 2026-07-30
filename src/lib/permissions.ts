/**
 * Platform staff permissions.
 *
 * Access used to be a single boolean — `adminRole === ADMIN` — so anyone who
 * could help a customer could also reverse a transaction, export every user's
 * email, and change platform settings. This splits that into verb-like
 * permissions, with roles as bundles of them.
 *
 * Pure and dependency-free, in the same shape as `src/lib/transaction-state.ts`:
 * one table, exhaustively unit-tested, read by BOTH the server guard and the
 * UI. The UI renders only what the table permits, but that is presentation —
 * `assertPermission()` is the authority, because server actions are addressable
 * POST endpoints that can be called without ever rendering the panel.
 */

import { AdminRole } from "@prisma/client";

/**
 * Verb-like atoms. Named `subject.verb` so a reader can tell at a glance what
 * a permission touches, and so related ones sort together.
 */
export const PERMISSIONS = [
  // Customers
  "customer.view",
  /** See unmasked email addresses. Absent → masked (see src/lib/mask.ts). */
  "customer.pii.view",
  "customer.suspend",
  "customer.export",
  /**
   * Open a read-only "view as user" session. Not granted to SUPPORT: seeing a
   * customer's screens is the most invasive read the panel offers, and support
   * is the widest seat. Revisit once ticket-scoped grants exist.
   */
  "customer.impersonate",
  // Transactions
  "transaction.view",
  "transaction.confirm",
  "transaction.dispute",
  /** Moves money back onto a card / out of a goal. Deliberately narrow. */
  "transaction.reverse",
  "transaction.export",
  // Support tickets (the backend lands next; permissions exist now so it
  // arrives already gated rather than retrofitted).
  "ticket.view",
  "ticket.reply",
  "ticket.assign",
  "ticket.resolve",
  "ticket.note.internal",
  /**
   * Record a signed adjustment on a household's Trust Score. SUPER_ADMIN only:
   * the score gates what a household is offered, so the ability to move it is
   * kept with the ability to change the system itself.
   */
  "trustscore.override",
  // Platform
  "settings.view",
  "settings.system.edit",
  "staff.manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/** Roles that may reach a staff panel at all. `USER` is not one of them. */
export type StaffRole = Extract<AdminRole, "SUPPORT" | "ADMIN" | "SUPER_ADMIN">;

/**
 * Role → permission bundles.
 *
 * Read this table as the product decision it is:
 *  • SUPPORT helps customers. It can see them (masked), read transactions, and
 *    work tickets — but it cannot move money, export data in bulk, suspend an
 *    account, or reach settings. A support seat is a common breach vector, so
 *    it gets the least data that still lets the job be done.
 *  • ADMIN runs operations: everything support can do, plus reversals, bulk
 *    export, suspensions, unmasked PII, and read access to settings.
 *  • SUPER_ADMIN additionally changes the system itself and manages staff
 *    roles — kept to one or two people.
 */
const SUPPORT_PERMISSIONS: Permission[] = [
  "customer.view",
  "transaction.view",
  "transaction.confirm",
  "transaction.dispute",
  "ticket.view",
  "ticket.reply",
  "ticket.assign",
  "ticket.resolve",
  "ticket.note.internal",
];

const ADMIN_PERMISSIONS: Permission[] = [
  ...SUPPORT_PERMISSIONS,
  "customer.pii.view",
  "customer.suspend",
  "customer.export",
  "customer.impersonate",
  "transaction.reverse",
  "transaction.export",
  "settings.view",
];

const SUPER_ADMIN_PERMISSIONS: Permission[] = [
  ...ADMIN_PERMISSIONS,
  "trustscore.override",
  "settings.system.edit",
  "staff.manage",
];

const ROLE_PERMISSIONS: Record<StaffRole, readonly Permission[]> = {
  SUPPORT: SUPPORT_PERMISSIONS,
  ADMIN: ADMIN_PERMISSIONS,
  SUPER_ADMIN: SUPER_ADMIN_PERMISSIONS,
};

/** Human labels for the topbar and the staff-management UI. */
export const ROLE_LABELS: Record<AdminRole, string> = {
  USER: "User",
  SUPPORT: "Support",
  ADMIN: "Administrator",
  SUPER_ADMIN: "Super Admin",
};

/** Ordered most- to least-privileged, for role pickers. */
export const STAFF_ROLES: StaffRole[] = ["SUPER_ADMIN", "ADMIN", "SUPPORT"];

export function isStaffRole(role: AdminRole | string): role is StaffRole {
  return role === "SUPPORT" || role === "ADMIN" || role === "SUPER_ADMIN";
}

/** Every permission this role holds. Empty for a non-staff user. */
export function permissionsFor(role: AdminRole | string): readonly Permission[] {
  return isStaffRole(role) ? ROLE_PERMISSIONS[role] : [];
}

/**
 * The single authorization question. Everything — guards, nav filtering,
 * button rendering — resolves to this.
 */
export function can(role: AdminRole | string, permission: Permission): boolean {
  return permissionsFor(role).includes(permission);
}

/** True when the role may open a staff panel at all. */
export function isStaff(role: AdminRole | string): boolean {
  return isStaffRole(role);
}

/**
 * Where a staff member lands. Support has its own workspace built around the
 * support workflow; anyone with settings access starts on the ops dashboard.
 */
export function homePathFor(role: AdminRole | string, locale: string): string {
  if (can(role, "settings.view")) return `/${locale}/admin`;
  if (can(role, "ticket.view")) return `/${locale}/support-desk`;
  return `/${locale}/dashboard`;
}
