"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { YurtMark } from "@/components/Logo";

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <YurtMark className="h-12 w-12 opacity-60" />
      <h1 className="mt-6 font-display text-2xl font-bold text-samarkand-950">
        {t("errorTitle")}
      </h1>
      <p className="mt-2 max-w-md text-sand-800">{t("errorBody")}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-lg bg-samarkand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-samarkand-800"
      >
        {t("retry")}
      </button>
    </div>
  );
}
