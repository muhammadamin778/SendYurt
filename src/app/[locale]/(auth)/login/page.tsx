import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LoginForm } from "@/components/auth/LoginForm";

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "auth" });
  return { title: t("loginTitle") };
}

export default function LoginPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  return (
    // LoginForm reads the ?from= redirect target via useSearchParams,
    // which requires a Suspense boundary to prerender statically.
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-sand-200" />}>
      <LoginForm />
    </Suspense>
  );
}
