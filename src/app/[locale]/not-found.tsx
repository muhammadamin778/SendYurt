import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { YurtMark } from "@/components/Logo";

export default function NotFound() {
  const t = useTranslations("errors");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ikat bg-sand-50 px-4 text-center">
      <YurtMark className="h-12 w-12 opacity-60" />
      <h1 className="mt-6 font-display text-3xl font-bold text-samarkand-950">
        {t("notFoundTitle")}
      </h1>
      <p className="mt-2 max-w-md text-sand-800">{t("notFoundBody")}</p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-samarkand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-samarkand-800"
      >
        {t("goHome")}
      </Link>
    </div>
  );
}
