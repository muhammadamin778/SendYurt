import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SupportDeskNav } from "@/components/support-desk/SupportDeskNav";
import { requireStaff } from "@/lib/admin";
import { ROLE_LABELS } from "@/lib/permissions";

// Same data-dense typography as the ops panel.
const inter = Inter({ subsets: ["latin"], display: "swap" });

// Per-request, permission-gated data — never prerender.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "SendYurt Support",
  robots: { index: false, follow: false },
};

/**
 * The support workspace.
 *
 * Deliberately a separate screen from `/admin`: support is a different job.
 * An agent looks a customer up, reads their context, and takes a few safe
 * actions — they should not have to navigate an operations UI built around
 * ledgers and corridor metrics.
 *
 * It is NOT a separate authorization system. The same `requireStaff` guard and
 * the same `src/lib/permissions.ts` table protect both surfaces, so there is
 * one place to reason about who can do what.
 *
 * `ticket.view` is the entry permission — every staff tier holds it, so ops
 * and admins can drop in here too.
 */
export default async function SupportDeskLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const staff = await requireStaff("ticket.view");
  const initial = (staff.name ?? staff.email ?? "?").trim().charAt(0).toUpperCase();

  return (
    <div className={`admin-shell ${inter.className} min-h-screen bg-[#f8f9fa] text-[#191c1d] antialiased`}>
      <SupportDeskNav
        locale={locale}
        permissions={staff.permissions}
        name={staff.name || staff.email}
        initial={initial}
        role={ROLE_LABELS[staff.role]}
      />
      <main className="mx-auto max-w-[1180px] p-6 pt-24">{children}</main>
    </div>
  );
}
