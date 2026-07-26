import { setRequestLocale } from "next-intl/server";
import { SupportBoard } from "@/components/admin/SupportBoard";
import { requireStaff } from "@/lib/admin";

export default async function AdminSupportPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  await requireStaff("ticket.view");

  return <SupportBoard />;
}
