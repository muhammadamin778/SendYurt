import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PublicHeader } from "@/components/PublicHeader";
import { YurtMark } from "@/components/Logo";
import { SuzaniDivider } from "@/components/ornament/Suzani";

function FeatureCard({
  title,
  body,
  icon,
}: {
  title: string;
  body: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-sand-200 bg-white p-6 shadow-card">
      <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-samarkand-50">
        {icon}
      </div>
      <h3 className="font-display text-lg font-bold text-samarkand-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-sand-800">{body}</p>
    </div>
  );
}

export default function LandingPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  return <Landing />;
}

function Landing() {
  const t = useTranslations("landing");

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-girih bg-sand-50">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24 text-center">
            <YurtMark className="mx-auto h-14 w-14" />
            <h1 className="mx-auto mt-6 max-w-2xl font-display text-4xl font-bold tracking-tight text-samarkand-950 sm:text-5xl text-balance">
              {t("heroTitle")}
            </h1>
            <SuzaniDivider className="mx-auto mt-5 h-5 w-52 text-terracotta-400" />
            <p className="mx-auto mt-4 max-w-xl text-lg text-sand-900">
              {t("heroSubtitle")}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/register"
                className="w-full rounded-lg bg-samarkand-700 px-6 py-3 text-base font-semibold text-white hover:bg-samarkand-800 sm:w-auto"
              >
                {t("ctaPrimary")}
              </Link>
              <Link
                href="/login"
                className="w-full rounded-lg border border-samarkand-300 bg-white px-6 py-3 text-base font-semibold text-samarkand-800 hover:bg-samarkand-50 sm:w-auto"
              >
                {t("ctaSecondary")}
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-center font-display text-2xl font-bold text-samarkand-950 sm:text-3xl">
            {t("featuresTitle")}
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              title={t("rates.title")}
              body={t("rates.body")}
              icon={
                <svg viewBox="0 0 24 24" className="h-6 w-6 text-samarkand-700" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="M4 17l5-5 4 4 7-8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M15 8h5v5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              }
            />
            <FeatureCard
              title={t("budget.title")}
              body={t("budget.body")}
              icon={
                <svg viewBox="0 0 24 24" className="h-6 w-6 text-samarkand-700" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="M4 21V10l8-6 8 6v11" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M9 21v-6h6v6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              }
            />
            <FeatureCard
              title={t("trust.title")}
              body={t("trust.body")}
              icon={
                <svg viewBox="0 0 24 24" className="h-6 w-6 text-samarkand-700" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6z" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              }
            />
          </div>
        </section>

        {/* How it works */}
        <section className="bg-samarkand-900 bg-girih-light">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 className="text-center font-display text-2xl font-bold text-white sm:text-3xl">
              {t("howTitle")}
            </h2>
            <ol className="mt-10 grid gap-8 sm:grid-cols-3">
              {([1, 2, 3] as const).map((step) => (
                <li key={step} className="text-center">
                  <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-terracotta-500 font-display text-lg font-bold text-white">
                    {step}
                  </span>
                  <h3 className="mt-4 font-semibold text-white">{t(`how${step}Title`)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-samarkand-100">
                    {t(`how${step}Body`)}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>

      <footer className="border-t border-sand-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-sand-700 sm:flex-row">
          <span>© {new Date().getFullYear()} SendYurt</span>
          <span>{t("footerNote")}</span>
        </div>
      </footer>
    </div>
  );
}
