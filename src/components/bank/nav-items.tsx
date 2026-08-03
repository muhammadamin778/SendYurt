"use client";

/**
 * The app's navigation list and its glyphs, in one place.
 *
 * Shared by the desktop sidebar and the mobile drawer. They previously could
 * not drift apart because only one existed; now that both do, a destination
 * added here appears in both rather than in whichever the author remembered.
 */

export type IconName =
  | "dashboard"
  | "wallet"
  | "rates"
  | "budget"
  | "trust"
  | "household"
  | "help"
  | "support"
  | "history"
  | "profile";

export const NAV: { href: string; key: string; icon: IconName }[] = [
  { href: "/dashboard", key: "dashboard", icon: "dashboard" },
  { href: "/wallet", key: "wallet", icon: "wallet" },
  { href: "/rates", key: "rates", icon: "rates" },
  { href: "/budget", key: "budget", icon: "budget" },
  { href: "/trust", key: "trust", icon: "trust" },
  { href: "/household", key: "household", icon: "household" },
  { href: "/history", key: "history", icon: "history" },
  { href: "/support", key: "support", icon: "support" },
  { href: "/help", key: "help", icon: "help" },
  { href: "/profile", key: "profile", icon: "profile" },
];

export function NavGlyph({ name }: { name: IconName }) {
  const p = { className: "h-[22px] w-[22px] shrink-0", fill: "none", stroke: "currentColor", strokeWidth: 1.7, viewBox: "0 0 24 24", "aria-hidden": true } as const;
  switch (name) {
    case "dashboard":
      return (
        <svg {...p}><path d="M4 21V10l8-6 8 6v11" strokeLinecap="round" strokeLinejoin="round" /><path d="M9 21v-7h6v7" strokeLinecap="round" strokeLinejoin="round" /></svg>
      );
    case "wallet":
      return (
        <svg {...p}><path d="M3 7a2 2 0 012-2h13a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" strokeLinecap="round" strokeLinejoin="round" /><path d="M16 12h4v-2h-4a1 1 0 000 2z" strokeLinecap="round" strokeLinejoin="round" /></svg>
      );
    case "rates":
      return (
        <svg {...p}><path d="M4 17l5-5 4 4 7-8" strokeLinecap="round" strokeLinejoin="round" /><path d="M15 8h5v5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      );
    case "budget":
      return (
        <svg {...p}><rect x="3" y="6" width="18" height="13" rx="3" /><path d="M3 10h18" strokeLinecap="round" /><path d="M16.5 14.5h.01" strokeLinecap="round" /></svg>
      );
    case "trust":
      return (
        <svg {...p}><path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6z" strokeLinecap="round" strokeLinejoin="round" /><path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" /></svg>
      );
    case "household":
      return (
        <svg {...p}><path d="M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round" /><circle cx="10" cy="8" r="4" /><path d="M20 21v-2a4 4 0 00-3-3.87" strokeLinecap="round" strokeLinejoin="round" /></svg>
      );
    case "help":
      return (
        <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M9.5 9.3a2.5 2.5 0 114.1 1.9c-.8.7-1.6 1.2-1.6 2.3M12 16.8v.2" strokeLinecap="round" /></svg>
      );
    case "support":
      return (
        <svg {...p}><path d="M21 11.5a8.4 8.4 0 01-9 8.4 9 9 0 01-3.9-.9L3 20l1.3-3.9A8.4 8.4 0 013.6 12a8.4 8.4 0 018.4-8.4 8.4 8.4 0 019 7.9z" strokeLinecap="round" strokeLinejoin="round" /></svg>
      );
    case "history":
      return (
        <svg {...p}><path d="M3 12a9 9 0 109-9 9 9 0 00-8 5M3 4v4h4M12 8v4l3 2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      );
    case "profile":
      return (
        <svg {...p}><circle cx="12" cy="8" r="4" /><path d="M6 21v-1a5 5 0 015-5h2a5 5 0 015 5v1" strokeLinecap="round" strokeLinejoin="round" /></svg>
      );
  }
}

