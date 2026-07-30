"use client";

import type { AdminRole } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { setStaffRole, setUserSuspended } from "@/app/actions/admin";
import { toast } from "@/components/ui/toast";
import { ROLE_LABELS } from "@/lib/permissions";
import { ViewAsUserButton } from "@/components/admin/ViewAsUserButton";

/**
 * Guarded controls for a user row — assign a staff tier, and suspend/reinstate.
 *
 * The tier is a real picker rather than the old promote/demote toggle, which
 * was a boolean over a four-value enum: a SUPPORT user rendered "promote" and
 * jumped straight to ADMIN, and a SUPER_ADMIN rendered "demote" and dropped
 * straight to USER. Neither could express "make this person support staff".
 *
 * `canManageStaff` / `canSuspend` decide what renders. That is presentation
 * only — `setStaffRole` and `setUserSuspended` call `assertPermission()`
 * server-side, so hitting the endpoint directly is still refused.
 */

/** Every assignable tier, most- to least-privileged. */
const ASSIGNABLE: AdminRole[] = ["SUPER_ADMIN", "ADMIN", "SUPPORT", "USER"];

export function UserRowActions({
  userId,
  userName,
  currentRole,
  suspended,
  isSelf,
  canManageStaff,
  canSuspend,
  canImpersonate,
  locale,
  impersonationTtlMinutes,
}: {
  userId: string;
  userName: string;
  currentRole: AdminRole;
  suspended: boolean;
  isSelf: boolean;
  canManageStaff: boolean;
  canSuspend: boolean;
  canImpersonate: boolean;
  locale: string;
  impersonationTtlMinutes: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<{ ok: true } | { ok: false; error: string }>, okMsg: string) {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    if (res.ok) {
      toast(okMsg);
      router.refresh();
      return;
    }
    toast(
      res.error === "self"
        ? "You can't change your own access."
        : res.error === "forbidden"
          ? "You don't have permission for that."
          : res.error === "above_own_tier"
            ? "You can't grant or change a tier above your own."
            : res.error === "last_super_admin"
              ? "There must always be at least one super admin."
              : res.error === "noop"
                ? "That user already has this tier."
                : "Action failed. Please try again.",
      "error",
    );
  }

  // Nothing to offer this viewer — a placeholder rather than an empty hover
  // zone that looks broken.
  // View-as is only offered for ordinary customers: staff accounts are refused
  // server-side (an ADMIN reading a SUPER_ADMIN's screens is escalation), and a
  // suspended account has no session to stand in for.
  const showViewAs = canImpersonate && !isSelf && currentRole === "USER" && !suspended;

  if (!canManageStaff && !canSuspend && !showViewAs) {
    return <span className="block text-right text-[11px] text-[#6f7a72]">—</span>;
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {showViewAs && (
        <ViewAsUserButton
          userId={userId}
          userName={userName}
          locale={locale}
          ttlMinutes={impersonationTtlMinutes}
        />
      )}

      {canManageStaff && (
        <label className="flex items-center gap-1.5">
          <span className="sr-only">Staff tier</span>
          <select
            value={currentRole}
            disabled={busy || isSelf}
            title={isSelf ? "You can't change your own access" : "Assign staff tier"}
            onChange={(e) => {
              const role = e.target.value as AdminRole;
              if (role === currentRole) return;
              void run(() => setStaffRole({ userId, role }), `Tier set to ${ROLE_LABELS[role]}.`);
            }}
            className="rounded-lg border border-[#bec9c0] bg-white px-2 py-1 text-[12px] font-semibold text-[#191c1d] outline-none focus:border-[#006c49] focus:ring-1 focus:ring-[#006c49] disabled:opacity-40"
          >
            {ASSIGNABLE.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </label>
      )}

      {canSuspend && (
        <button
          type="button"
          disabled={busy || isSelf}
          onClick={() =>
            run(
              () => setUserSuspended({ userId, suspended: !suspended }),
              suspended ? "Account reinstated." : "Account suspended.",
            )
          }
          title={isSelf ? "You can't suspend yourself" : suspended ? "Reinstate account" : "Suspend account"}
          className={`grid h-9 w-9 place-items-center rounded-lg transition-colors disabled:opacity-40 ${
            suspended ? "text-[#735c00] hover:bg-[#fed65b]/20" : "text-[#ba1a1a] hover:bg-[#ba1a1a]/10"
          }`}
        >
          {suspended ? (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M6 6l12 12" strokeLinecap="round" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}
