import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/Logo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export function PublicHeader() {
  const t = useTranslations("common");

  return (
    <header className="border-b border-sand-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Link href="/" aria-label="SendYurt">
          <Logo />
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher />
          <Link
            href="/login"
            className="rounded-lg px-3 py-2 text-sm font-semibold text-samarkand-800 hover:bg-samarkand-50"
          >
            {t("logIn")}
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-samarkand-700 px-3.5 py-2 text-sm font-semibold text-white hover:bg-samarkand-800"
          >
            {t("register")}
          </Link>
        </nav>
      </div>
    </header>
  );
}
