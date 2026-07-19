"use client";

/**
 * Admin error boundary. If a child (guard or dashboard query) throws — most
 * likely a transient DB reach error while Neon wakes from suspend — show a
 * friendly retry surface instead of a blank white screen.
 */
export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="grid min-h-screen place-items-center bg-[#f8f9fa] p-6 text-[#191c1d]">
      <div className="w-full max-w-md rounded-xl border border-[#bec9c0] bg-white p-8 text-center shadow-sm">
        <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-[#006c49]/10 text-[#006c49]">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
            <path d="M12 8v5M12 16v.5M12 3a9 9 0 100 18 9 9 0 000-18z" strokeLinecap="round" />
          </svg>
        </span>
        <h1 className="text-[18px] font-semibold">Admin data is warming up</h1>
        <p className="mt-2 text-[14px] text-[#3f4943]">
          The database was idle and is coming back online (Neon free-tier auto-suspend). Give it a second and try again.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#006c49] px-5 py-2.5 text-[13px] font-semibold uppercase tracking-[0.05em] text-white transition-colors hover:bg-[#005136]"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
