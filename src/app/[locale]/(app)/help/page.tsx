import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BankHeading, BankPage } from "@/components/bank/ui";
import { requireUser } from "@/lib/session";

const TOPICS = [
  { key: "rates", tone: "blue", icon: "M4 17l5-5 4 4 7-8M15 8h5v5", href: "/rates" },
  { key: "budget", tone: "teal", icon: "M4 21V10l8-6 8 6v11M9 21v-6h6v6", href: "/budget" },
  { key: "trust", tone: "gold", icon: "M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6zM9 12l2 2 4-4", href: "/trust" },
  { key: "household", tone: "pink", icon: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8z", href: "/household" },
  { key: "notifications", tone: "blue", icon: "M18 9a6 6 0 10-12 0c0 5-2 6-2 6h16s-2-1-2-6M10.3 19a2 2 0 003.4 0", href: "/dashboard" },
  { key: "report", tone: "teal", icon: "M7 17h10M7 13h10M7 9h4M5 3h10l4 4v14a1 1 0 01-1 1H5a1 1 0 01-1-1V4a1 1 0 011-1z", href: "/trust/report" },
] as const;

const TONES: Record<string, string> = {
  blue: "bg-[#dcfce7] text-[#0a7c53]",
  teal: "bg-[#d1fae5] text-[#059669]",
  gold: "bg-[#fff5d9] text-[#f5b544]",
  pink: "bg-[#fee2e2] text-[#ef4444]",
};

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "help" });
  return { title: t("title") };
}

export default async function HelpPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  await requireUser();
  const t = await getTranslations("help");

  return (
    <BankPage>
      <BankHeading title={t("title")} sub={t("subtitle")} />

      {/* Assistant hero */}
      <div className="relative overflow-hidden rounded-[25px] bg-gradient-to-br from-[#1f2a44] to-[#0b1220] p-7 text-white sm:p-9">
        <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-16 right-24 h-40 w-40 rounded-full bg-[#34d399]/20" />
        <div className="relative max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
            <span className="h-2 w-2 rounded-full bg-[#34d399]" aria-hidden="true" />
            SendYurt AI
          </span>
          <h2 className="mt-3 text-[24px] font-bold leading-tight sm:text-[28px]">{t("subtitle")}</h2>
          <p className="mt-2 text-[15px] text-white/80">{t("footer")}</p>
        </div>
      </div>

      {/* FAQ topics */}
      <section aria-label={t("title")}>
        <div className="grid gap-6 md:grid-cols-2">
          {TOPICS.map((topic) => (
            <Link key={topic.key} href={topic.href} className="group block">
              <div className="bank-card h-full p-6 transition-transform group-hover:-translate-y-0.5">
                <span className={`grid h-14 w-14 place-items-center rounded-2xl ${TONES[topic.tone]}`}>
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                    <path d={topic.icon} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <h3 className="mt-4 text-[16px] font-bold text-[#0f172a]">{t(`${topic.key}.q`)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#64748b]">{t(`${topic.key}.a`)}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#0a7c53]" aria-hidden="true">
                  →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </BankPage>
  );
}
