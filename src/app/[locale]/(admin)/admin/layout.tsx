import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { VisitLogger } from "@/components/VisitLogger";
import { requireStaff } from "@/lib/admin";
import { ROLE_LABELS } from "@/lib/permissions";

// The admin design system is Inter-exclusive (data-dense, tabular figures).
const inter = Inter({ subsets: ["latin"], display: "swap" });

// Per-request, per-admin data behind a role guard — never prerender.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "SendYurt Admin",
  robots: { index: false, follow: false },
};

/**
 * Admin shell. `requireAdmin()` runs on the server for every child route:
 * unauthenticated visitors are sent to login and authenticated non-admins are
 * bounced home — so nothing under /admin renders without a verified ADMIN
 * role. This single choke point protects the whole section.
 */
export default async function AdminLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  // No permission argument: the ops panel is open to any staff tier, and each
  // page/control gates itself on what it actually needs.
  const staff = await requireStaff();
  const initial = (staff.name ?? staff.email ?? "?").trim().charAt(0).toUpperCase();

  return (
    <div className={`admin-shell ${inter.className} min-h-screen bg-[#f8f9fa] text-[#191c1d] antialiased`}>
      {/* Permissions flow down so client components render only what this
          role may use. The server re-checks on every action regardless. */}
      <AdminSidebar locale={locale} permissions={staff.permissions} />
      <AdminTopbar
        name={staff.name || staff.email}
        initial={initial}
        role={ROLE_LABELS[staff.role]}
        locale={locale}
      />
      <main className="ml-[260px] min-h-screen p-6 pt-[72px]">{children}</main>
      <VisitLogger />
    </div>
  );
}
