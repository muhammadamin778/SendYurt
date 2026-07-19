import { setRequestLocale } from "next-intl/server";
import { SupportBoard } from "@/components/admin/SupportBoard";
import { requireAdmin } from "@/lib/admin";

export default async function AdminSupportPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  await requireAdmin();

  return <SupportBoard />;
}
