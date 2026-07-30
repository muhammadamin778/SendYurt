"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { startImpersonation } from "@/app/actions/impersonation";
import { toast } from "@/components/ui/toast";

/**
 * Opens a read-only "view as user" session.
 *
 * The reason prompt is not a formality: it is the only part of the audit entry
 * a human wrote, and it is what an auditor reads first. So it is required, has
 * a minimum length, and is asked for *before* anything happens rather than
 * offered as an optional note afterwards.
 *
 * Rendering is gated by `customer.impersonate`, but that is presentation —
 * `startImpersonation` re-checks server-side.
 */
export function ViewAsUserButton({
  userId,
  userName,
  locale,
  ttlMinutes,
}: {
  userId: string;
  userName: string;
  locale: string;
  ttlMinutes: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    const res = await startImpersonation({ userId, reason });
    setBusy(false);
    if (res.ok) {
      setOpen(false);
      setReason("");
      // Land on the customer's dashboard. A full navigation, not router.push,
      // so the new session cookie is applied to every subsequent request.
      window.location.href = `/${locale}/dashboard`;
      return;
    }
    toast(
      res.error === "reason_too_short"
        ? "Give a reason of at least 10 characters."
        : res.error === "target_is_staff"
          ? "Staff accounts can't be viewed this way."
          : res.error === "forbidden"
            ? "You don't have permission to view accounts."
            : res.error === "read_only_session"
              ? "Exit your current view-as session first."
              : res.error === "not_found"
                ? "That account is unavailable."
                : "Couldn't start the session. Please try again.",
      "error",
    );
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={`View the app as ${userName} (read-only)`}
        className="grid h-9 w-9 place-items-center rounded-lg text-[#3f4943] transition-colors hover:bg-[#e7e8e9]"
      >
        <span className="sr-only">View as {userName}</span>
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#191c1d]/40 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="view-as-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 id="view-as-title" className="text-[17px] font-bold text-[#191c1d]">
              View as {userName}
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-[#3f4943]">
              You will see their screens exactly as they do. The session is{" "}
              <strong>read-only</strong> — nothing can be changed while it is open — it ends
              automatically after {ttlMinutes} minutes, and both the start and the end are
              recorded against your name.
            </p>

            <label className="mt-4 block">
              <span className="text-[12px] font-semibold text-[#3f4943]">Reason (recorded in the audit log)</span>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                maxLength={280}
                autoFocus
                placeholder="e.g. Ticket 412 — customer reports their savings goal shows the wrong balance"
                className="mt-1.5 w-full resize-none rounded-lg border border-[#bec9c0] bg-white px-3 py-2 text-[13px] text-[#191c1d] outline-none focus:border-[#006c49] focus:ring-1 focus:ring-[#006c49]"
              />
            </label>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={busy}
                className="rounded-lg px-4 py-2 text-[13px] font-semibold text-[#3f4943] transition-colors hover:bg-[#e7e8e9]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={busy || reason.trim().length < 10}
                className="rounded-lg bg-[#006c49] px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#005136] disabled:opacity-40"
              >
                {busy ? "Starting…" : "Start read-only session"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
