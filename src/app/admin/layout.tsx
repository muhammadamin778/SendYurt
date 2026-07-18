import type { Metadata } from "next";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { requireAdmin } from "@/lib/admin";

// Per-request, per-admin data behind a role guard — never prerender.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "SendYurt Admin", robots: { index: false, follow: false } };

/**
 * Admin shell. `requireAdmin()` runs on the server for every child route:
 * unauthenticated visitors are sent to login, and authenticated non-admins
 * are bounced home — so nothing under /admin renders without a verified
 * ADMIN role. This is the single choke point that protects the whole section.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const initial = (admin.name ?? admin.email ?? "?").trim().charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-[#f8f9fa] font-sans text-[#191c1d]">
      <AdminSidebar />
      <AdminTopbar name={admin.name || admin.email} initial={initial} role="Super Admin" />
      <main className="ml-[260px] min-h-screen p-6 pt-14">{children}</main>
    </div>
  );
}
