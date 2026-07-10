import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "auth" });
  return { title: t("resetTitle") };
}

export default function ResetPasswordPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  return (
    // The form reads ?token= via useSearchParams → Suspense required for
    // static prerendering.
    <Suspense fallback={<div className="h-72 animate-pulse rounded-xl bg-sand-200" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
