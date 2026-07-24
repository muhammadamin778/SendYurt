import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { NewGoalForm } from "@/components/budget/NewGoalForm";
import { formatNumber } from "@/lib/format";
import { getUzsRates } from "@/lib/fx";
import { requireUser } from "@/lib/session";

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "budget" });
  return { title: t("newGoal.title") };
}

export default async function NewGoalPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  const user = await requireUser();
  // Only household admins may create goals (server action enforces this too).
  if (user.accessRole !== "ADMIN") redirect(`/${locale}/budget/manage`);

  const t = await getTranslations("budget");
  const currentLocale = await getLocale();

  let usdRate = 0;
  try {
    const fx = await getUzsRates();
    usdRate = fx.rates.USD ?? 0;
  } catch {
    // Rate card is contextual — fall back silently if the feed is unavailable.
  }

  return (
    <div className="mx-auto max-w-[1180px]">
      {/* Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-[24px] font-bold text-[#191c1e] md:text-[32px] md:tracking-[-0.02em]">{t("newGoal.title")}</h1>
          <p className="mt-1 text-[#45464d]">{t("newGoal.subtitle")}</p>
        </div>
        <div className="flex w-fit items-center gap-2 rounded-full bg-[#9af2c5] px-3 py-1 text-[#00714d]">
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden="true"><path d="M12 2l8 3v6c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V5l8-3z" /></svg>
          <span className="text-[14px] font-medium">{t("newGoal.secureStorage")}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: form + tip */}
        <div className="space-y-4 lg:col-span-8">
          <NewGoalForm />

          {/* Financial tip */}
          <div className="flex items-start gap-4 rounded-xl bg-[#ffddb8] p-6 text-[#653e00]">
            <svg viewBox="0 0 24 24" className="mt-0.5 h-6 w-6 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <circle cx="12" cy="12" r="9" /><path d="M12 8h.01M11 12h1v4h1" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div>
              <p className="mb-1 text-[14px] font-bold">{t("newGoal.tipTitle")}</p>
              <p className="text-[14px] leading-relaxed text-[#653e00]/90">{t("newGoal.tipBody")}</p>
            </div>
          </div>
        </div>

        {/* Right: visual + rate */}
        <div className="space-y-4 lg:col-span-4">
          <div className="relative h-64 overflow-hidden rounded-[32px] border border-[#c6c6cd] shadow-lg lg:h-80">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCA8jolJziRCRlGJS99bi5wmw7E5yUlEqmHx0_BjQUsxUuxiC_07sA3UGOSp2f9_sJOHlt6-W33IIjstXLy5J3gnozPjoYvRAARLdzJBCA_XUhvAK3UsKJx4VLFPkKvm_f5uKxUQfbSVk39P0WQtjL_Fns12gdE8-zlnqp7m1RTjrmZObl6hbiENOi2jXFmdE9Q8mGafMYq5B3X3xyr51hCd3ZTpVohsOVY7NwxzsGOwTHX5hDniz0DHbDbYe4Cx8cVGJE7eWfa0QSD"
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute inset-x-6 bottom-6 z-20">
              <p className="mb-2 text-[22px] font-bold leading-tight text-white">{t("newGoal.legacyTitle")}</p>
              <p className="text-[14px] text-white/80">{t("newGoal.legacySub")}</p>
            </div>
          </div>

          {/* Market rate tracker */}
          <div className="space-y-2 rounded-[32px] border border-[#c6c6cd] bg-white/80 p-6 shadow-sm backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-medium uppercase tracking-wider text-[#45464d]">{t("newGoal.marketRate")}</span>
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#006c49]" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true"><path d="M4 17l6-6 4 4 8-8M15 7h6v6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-[40px] font-bold leading-none tabular-nums text-[#191c1e]">{formatNumber(usdRate, currentLocale, 2)}</span>
              <span className="text-[20px] font-semibold text-[#45464d]">UZS / USD</span>
            </div>
            <div className="pt-2">
              <div className="h-1 w-full overflow-hidden rounded-full bg-[#e6e8ea]">
                <div className="h-full w-[65%] bg-[#006c49]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
