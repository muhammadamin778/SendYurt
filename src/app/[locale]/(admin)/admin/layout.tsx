import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { requireAdmin } from "@/lib/admin";

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
  const admin = await requireAdmin();
  const initial = (admin.name ?? admin.email ?? "?").trim().charAt(0).toUpperCase();

  return (
    <div className={`${inter.className} min-h-screen bg-[#f8f9fa] text-[#191c1d] antialiased`}>
      <AdminSidebar locale={locale} />
      <AdminTopbar name={admin.name || admin.email} initial={initial} role="Super Admin" />
      <main className="ml-[260px] min-h-screen p-6 pt-[72px]">{children}</main>
    </div>
  );
}
