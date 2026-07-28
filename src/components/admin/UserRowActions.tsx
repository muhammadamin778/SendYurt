"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { promoteToAdmin, demoteFromAdmin, setUserSuspended } from "@/app/actions/admin";
import { toast } from "@/components/ui/toast";

/**
 * Guarded controls for a user row — promote/demote staff and suspend/unsuspend,
 * each wired to an audited server action.
 *
 * `canManageStaff` / `canSuspend` come from the viewer's permissions and decide
 * what renders. That is presentation only: the actions call
 * `assertPermission()` server-side, so a support agent hitting the endpoint
 * directly is still refused.
 */
export function UserRowActions({
  userId,
  isAdmin,
  suspended,
  isSelf,
  canManageStaff,
  canSuspend,
}: {
  userId: string;
  isAdmin: boolean;
  suspended: boolean;
  isSelf: boolean;
  canManageStaff: boolean;
  canSuspend: boolean;
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
    } else {
      toast(
        res.error === "self"
          ? "You can't do that to your own account."
          : res.error === "forbidden"
            ? "You don't have permission for that."
            : res.error === "last_super_admin"
              ? "There must always be at least one super admin."
              : "Action failed. Please try again.",
        "error",
      );
    }
  }

  const btn = "grid h-9 w-9 place-items-center rounded-lg transition-colors disabled:opacity-40";

  // Nothing to offer this viewer — render nothing rather than an empty hover zone.
  if (!canManageStaff && !canSuspend) {
    return <span className="block text-right text-[11px] text-[#6f7a72]">—</span>;
  }

  return (
    <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
      {/* Promote / demote staff */}
      {canManageStaff && (isAdmin ? (
        <button
          type="button"
          disabled={busy || isSelf}
          onClick={() => run(() => demoteFromAdmin({ userId }), "Admin access removed.")}
          title={isSelf ? "You can't demote yourself" : "Remove admin access"}
          className={`${btn} text-[#772f2c] hover:bg-[#954642]/10`}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6zM9 12h6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => run(() => promoteToAdmin({ userId }), "User promoted to admin.")}
          title="Promote to admin"
          className={`${btn} text-[#005136] hover:bg-[#006c49]/10`}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6zM9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      ))}

      {/* Suspend / unsuspend */}
      {canSuspend && (
      <button
        type="button"
        disabled={busy || isSelf}
        onClick={() => run(() => setUserSuspended({ userId, suspended: !suspended }), suspended ? "Account reinstated." : "Account suspended.")}
        title={isSelf ? "You can't suspend yourself" : suspended ? "Reinstate account" : "Suspend account"}
        className={`${btn} ${suspended ? "text-[#735c00] hover:bg-[#fed65b]/20" : "text-[#ba1a1a] hover:bg-[#ba1a1a]/10"}`}
      >
        {suspended ? (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M6 6l12 12" strokeLinecap="round" /></svg>
        )}
      </button>
      )}
    </div>
  );
}
