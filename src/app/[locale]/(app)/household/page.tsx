import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { CopyButton } from "@/components/CopyButton";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "household" });
  return { title: t("title") };
}

function RoleBadge({ role, label }: { role: string; label: string }) {
  return (
    <span
      className={
        role === "SENDER"
          ? "rounded-full bg-samarkand-50 px-2.5 py-0.5 text-xs font-semibold text-samarkand-800 dark:bg-samarkand-900 dark:text-samarkand-200"
          : "rounded-full bg-terracotta-50 px-2.5 py-0.5 text-xs font-semibold text-terracotta-800 dark:bg-terracotta-950 dark:text-terracotta-200"
      }
    >
      {label}
    </span>
  );
}

export default async function HouseholdPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  const user = await requireUser();
  const t = await getTranslations("household");
  const currentLocale = await getLocale();

  const household = await prisma.household.findUnique({
    where: { id: user.householdId },
    include: { users: { orderBy: { createdAt: "asc" } } },
  });
  if (!household) return null; // requireUser guarantees existence

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-samarkand-950 sm:text-3xl">
          {household.name}
        </h1>
        <p className="mt-1 text-sand-800">{t("subtitle")}</p>
      </div>

      <section aria-label={t("membersTitle")}>
        <h2 className="font-display text-lg font-bold text-samarkand-950">
          {t("membersTitle", { count: household.users.length })}
        </h2>
        <Card className="mt-4 divide-y divide-sand-100">
          {household.users.map((member) => (
            <div key={member.id} className="flex items-center gap-4 px-5 py-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-samarkand-100 font-display text-base font-bold text-samarkand-800">
                {member.name.trim().charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-semibold text-ink">
                    {member.name}
                    {member.id === user.id && (
                      <span className="ml-1.5 text-xs font-normal text-sand-600">
                        {t("you")}
                      </span>
                    )}
                  </span>
                  <RoleBadge
                    role={member.role}
                    label={t(member.role === "SENDER" ? "roleSender" : "roleReceiver")}
                  />
                </div>
                <p className="mt-0.5 truncate text-xs text-sand-700">
                  {t("joined", { date: formatDate(member.createdAt, currentLocale) })}
                </p>
              </div>
            </div>
          ))}
        </Card>
      </section>

      <section aria-label={t("inviteTitle")}>
        <Card accent className="p-5">
          <h2 className="font-display text-lg font-bold text-samarkand-950">
            {t("inviteTitle")}
          </h2>
          <p className="mt-1 max-w-xl text-sm text-sand-800">{t("inviteBody")}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <code className="rounded-lg bg-samarkand-50 px-4 py-2 font-mono text-lg font-bold tracking-widest text-samarkand-800 dark:bg-night dark:text-samarkand-200">
              {household.inviteCode}
            </code>
            <CopyButton value={household.inviteCode} />
          </div>
          <p className="mt-3 text-xs text-sand-600">{t("inviteHint")}</p>
        </Card>
      </section>
    </div>
  );
}
