"use client";

import type { AdminRole } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { setStaffRole } from "@/app/actions/admin";
import { toast } from "@/components/ui/toast";
import { ROLE_LABELS } from "@/lib/permissions";

/**
 * Assign a staff tier from the User 360 screen.
 *
 * The same action the user list uses, surfaced on the profile page — which is
 * where someone actually decides "this person should be support", having just
 * read their history. The list previously held the only copy, so the decision
 * and the evidence for it were on different screens.
 *
 * Rendering is gated on `staff.manage`, but that is presentation: `setStaffRole`
 * re-checks server-side and enforces the guards that matter — no self-change,
 * no granting above your own tier, and never removing the last super admin.
 */

/** Every assignable tier, most- to least-privileged. */
const ASSIGNABLE: AdminRole[] = ["SUPER_ADMIN", "ADMIN", "SUPPORT", "USER"];

export function StaffRoleSelect({
  userId,
  currentRole,
  isSelf,
}: {
  userId: string;
  currentRole: AdminRole;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <label className="flex items-center gap-2">
      <span className="sr-only">Staff tier</span>
      <select
        value={currentRole}
        disabled={busy || isSelf}
        title={isSelf ? "You can't change your own access" : "Assign staff tier"}
        onChange={async (e) => {
          const role = e.target.value as AdminRole;
          if (role === currentRole) return;
          setBusy(true);
          const res = await setStaffRole({ userId, role });
          setBusy(false);
          if (res.ok) {
            toast(`Tier set to ${ROLE_LABELS[role]}.`);
            router.refresh();
            return;
          }
          toast(
            res.error === "self"
              ? "You can't change your own access."
              : res.error === "above_own_tier"
                ? "You can't grant a tier above your own."
                : res.error === "last_super_admin"
                  ? "There must always be at least one super admin."
                  : res.error === "forbidden"
                    ? "Only a super admin can assign staff tiers."
                    : res.error === "read_only_session"
                      ? "Exit your view-as session first."
                      : "Couldn't change the tier. Please try again.",
            "error",
          );
          router.refresh();
        }}
        className="rounded-lg border border-[#bec9c0] bg-white px-2 py-1 text-[13px] font-semibold text-[#191c1d] outline-none focus:border-[#006c49] focus:ring-1 focus:ring-[#006c49] disabled:opacity-40"
      >
        {ASSIGNABLE.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r]}
          </option>
        ))}
      </select>
    </label>
  );
}
