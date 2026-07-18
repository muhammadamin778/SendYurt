import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { GoalDetailActions } from "@/components/budget/GoalDetailActions";
import { getGoalDetail } from "@/lib/budget-data";
import { formatDate, formatMoney } from "@/lib/format";
import { requireUser } from "@/lib/session";

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "budget" });
  return { title: t("goalDetail.milestonesTitle") };
}

const RING_R = 80;
const RING_C = 2 * Math.PI * RING_R;

export default async function GoalDetailPage({
  params: { locale, goalId },
}: {
  params: { locale: string; goalId: string };
}) {
  setRequestLocale(locale);
  const user = await requireUser();
  const t = await getTranslations("budget");
  const currentLocale = await getLocale();

  const goal = await getGoalDetail(goalId, user.householdId);
  if (!goal) notFound();

  const canEdit = user.accessRole === "ADMIN";
  const pct = goal.targetAmount > 0 ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100) : 0;
  const pctRounded = Math.round(pct);
  const ringOffset = RING_C * (1 - pct / 100);
  const earliest = goal.history.length ? goal.history[goal.history.length - 1].amount : 0;

  const milestones = [
    { label: t("goalDetail.mFirst"), threshold: 0.01, amount: earliest || goal.targetAmount * 0.05 },
    { label: t("goalDetail.mQuarter"), threshold: goal.targetAmount * 0.25, amount: goal.targetAmount * 0.25 },
    { label: t("goalDetail.mHalf"), threshold: goal.targetAmount * 0.5, amount: goal.targetAmount * 0.5 },
    { label: t("goalDetail.mThreeQuarter"), threshold: goal.targetAmount * 0.75, amount: goal.targetAmount * 0.75 },
    { label: t("goalDetail.mGoal"), threshold: goal.targetAmount, amount: goal.targetAmount },
  ];
  const firstPendingIdx = milestones.findIndex((m) => goal.currentAmount < m.threshold);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header row: status card + quick actions/contributors */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Goal status */}
        <div className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-sm lg:col-span-7">
          <div className="mb-6 flex items-start justify-between gap-3">
            <div>
              <h1 className="text-[32px] font-bold leading-tight text-[#0f172a]">{goal.name}</h1>
              <p className="text-[18px] text-[#64748b]">{t("goalDetail.subtitle")}</p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#dcfce7] px-3 py-1 text-sm font-medium text-[#065f3e]">
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden="true">
                <path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 7.7l5.4-.8z" />
              </svg>
              {t("goalDetail.familyGoal")}
            </span>
          </div>

          <div className="flex flex-col items-center gap-8 py-2 md:flex-row">
            {/* Progress ring */}
            <div className="relative flex items-center justify-center">
              <svg width="192" height="192" viewBox="0 0 192 192" aria-hidden="true">
                <circle cx="96" cy="96" r={RING_R} fill="transparent" stroke="#e6e8ea" strokeWidth="12" />
                <circle
                  cx="96"
                  cy="96"
                  r={RING_R}
                  fill="transparent"
                  stroke="#0a7c53"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={RING_C}
                  strokeDashoffset={ringOffset}
                  transform="rotate(-90 96 96)"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-[40px] font-bold leading-none text-[#0f172a]">{pctRounded}%</span>
                <span className="text-sm text-[#64748b]">{t("goalDetail.completed")}</span>
              </div>
            </div>

            {/* Money stats */}
            <div className="w-full flex-1 space-y-4">
              <div>
                <span className="text-sm uppercase tracking-wider text-[#64748b]">{t("goalDetail.currentAmount")}</span>
                <div className="text-[32px] font-bold text-[#0a7c53]">{formatMoney(goal.currentAmount, "UZS", currentLocale)}</div>
              </div>
              <div className="h-px w-full bg-[#e2e8f0]" />
              <div>
                <span className="text-sm uppercase tracking-wider text-[#64748b]">{t("goalDetail.targetGoal")}</span>
                <div className="text-[20px] font-semibold text-[#0f172a]">{formatMoney(goal.targetAmount, "UZS", currentLocale)}</div>
              </div>
              {goal.targetDate && (
                <div className="flex items-center gap-2 text-[#64748b]">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#0a7c53]" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
                  </svg>
                  {t("goalDetail.targetDatePrefix")}: {formatDate(goal.targetDate, currentLocale)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick actions + contributors */}
        <div className="space-y-6 lg:col-span-5">
          <div className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-[20px] font-semibold text-[#0f172a]">{t("goalDetail.quickActions")}</h3>
            <GoalDetailActions
              goal={{
                id: goal.id,
                name: goal.name,
                targetAmount: goal.targetAmount,
                currentAmount: goal.currentAmount,
                targetDateIso: goal.targetDate ? goal.targetDate.toISOString() : null,
              }}
              canEdit={canEdit}
            />
          </div>

          <div className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-[20px] font-semibold text-[#0f172a]">{t("goalDetail.contributors")}</h3>
            <div className="space-y-4">
              {goal.contributors.length === 0 && (
                <p className="text-sm text-[#64748b]">{t("goalDetail.noContributions")}</p>
              )}
              {goal.contributors.map((c, i) => (
                <div key={c.userId} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`grid h-10 w-10 place-items-center rounded-full font-bold ${i % 2 === 0 ? "bg-[#131b2e] text-white" : "bg-[#dcfce7] text-[#065f3e]"}`}>
                      {c.name.trim().charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-[#0f172a]">
                        {c.name}
                        {c.isOwner && <span className="text-[#64748b]"> ({t("goalDetail.owner")})</span>}
                      </p>
                      <p className="text-xs text-[#64748b]">{t("goalDetail.contributionsCount", { count: c.count })}</p>
                    </div>
                  </div>
                  <span className="font-semibold tabular-nums tracking-wide text-[#0a7c53]">{formatMoney(c.total, "UZS", currentLocale)}</span>
                </div>
              ))}
              <Link
                href="/household"
                className="flex w-full items-center justify-center rounded-xl border-2 border-dashed border-[#cbd5e1] py-2 text-sm font-medium text-[#64748b] transition-colors hover:border-[#0a7c53] hover:text-[#0a7c53]"
              >
                + {t("goalDetail.inviteMember")}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Milestones */}
      <section>
        <h3 className="mb-4 text-[24px] font-bold text-[#0f172a]">{t("goalDetail.milestonesTitle")}</h3>
        <div className="overflow-x-auto pb-4">
          <div className="flex min-w-[800px] items-start gap-3">
            {milestones.map((m, i) => {
              const achieved = goal.currentAmount >= m.threshold;
              const inProgress = !achieved && i === firstPendingIdx;
              return (
                <div key={m.label} className="flex flex-1 items-start gap-3">
                  <div
                    className={`relative flex-1 rounded-2xl border-2 p-4 ${
                      achieved
                        ? "border-[#0a7c53] bg-[#0a7c53]/[0.06]"
                        : inProgress
                          ? "border-[#0a7c53]/40 bg-white"
                          : "border-dashed border-[#cbd5e1] bg-[#f8fafc] opacity-70"
                    }`}
                  >
                    {achieved && (
                      <span className="absolute -left-3 -top-3 grid h-7 w-7 place-items-center rounded-full bg-[#0a7c53] text-white shadow-md">
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    )}
                    <p className={`text-sm font-bold ${achieved ? "text-[#065f3e]" : "text-[#64748b]"}`}>{m.label}</p>
                    <p className="mt-1 text-xs text-[#94a3b8]">
                      {achieved ? t("goalDetail.statusAchieved") : inProgress ? t("goalDetail.statusInProgress") : t("goalDetail.statusLocked")}
                    </p>
                    <div className="mt-3 font-semibold tabular-nums text-[#0f172a]">{formatMoney(m.amount, "UZS", currentLocale)}</div>
                  </div>
                  {i < milestones.length - 1 && (
                    <div className="pt-10 text-[#cbd5e1]">
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M4 12h16M14 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Contribution history */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[24px] font-bold text-[#0f172a]">{t("goalDetail.contributionHistory")}</h3>
          <Link href="/summary" className="flex items-center gap-1 text-sm font-medium text-[#0a7c53]">
            {t("goalDetail.export")}
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
        <div className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-[#f1f5f9] text-sm font-medium text-[#64748b]">
                  <th className="px-6 py-4 font-semibold">{t("goalDetail.thDate")}</th>
                  <th className="px-6 py-4 font-semibold">{t("goalDetail.thContributor")}</th>
                  <th className="px-6 py-4 font-semibold">{t("goalDetail.thDescription")}</th>
                  <th className="px-6 py-4 text-right font-semibold">{t("goalDetail.thAmount")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0] text-[15px]">
                {goal.history.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-6 text-center text-[#64748b]">{t("goalDetail.noContributions")}</td>
                  </tr>
                )}
                {goal.history.slice(0, 6).map((h) => (
                  <tr key={h.id} className="transition-colors hover:bg-[#f8fafc]">
                    <td className="px-6 py-4 text-[#64748b]">{formatDate(h.date, currentLocale)}</td>
                    <td className="px-6 py-4 font-medium text-[#0f172a]">{h.contributor}</td>
                    <td className="px-6 py-4 text-[#0f172a]">{h.note}</td>
                    <td className="px-6 py-4 text-right font-bold text-[#0a7c53]">+{formatMoney(h.amount, "UZS", currentLocale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {goal.history.length > 6 && (
            <div className="bg-[#f8fafc] px-6 py-4 text-center">
              <Link href="/budget/manage" className="text-sm font-medium text-[#0a7c53]">{t("goalDetail.viewAll")}</Link>
            </div>
          )}
        </div>
      </section>

      {/* Visualize hero */}
      <div className="relative h-64 overflow-hidden rounded-2xl bg-gradient-to-br from-[#1f2a44] to-[#0b1220] shadow-lg">
        <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-12 h-56 w-56 rounded-full bg-[#4edea3]/10" />
        <div aria-hidden="true" className="pointer-events-none absolute bottom-8 right-24 h-32 w-32 rounded-full bg-white/5" />
        <div className="absolute inset-0 flex flex-col justify-end p-6">
          <h4 className="text-[24px] font-bold text-white">{t("goalDetail.visualizeTitle")}</h4>
          <p className="text-[15px] text-white/80">{t("goalDetail.visualizeBody", { percent: pctRounded })}</p>
        </div>
      </div>
    </div>
  );
}
