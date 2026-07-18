import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { MemberAccessToggle } from "@/components/household/MemberAccessToggle";
import { InviteMemberButton, RemoveMemberButton } from "@/components/household/MemberActions";
import { HouseholdSettingsForm } from "@/components/household/HouseholdSettingsForm";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "household" });
  return { title: t("settingsTitle") };
}

const AVATAR_GRADIENTS = [
  "from-[#0a7c53] to-[#065f3e]",
  "from-[#1f2a44] to-[#0b1220]",
  "from-[#d9a441] to-[#b87500]",
];

export default async function HouseholdPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  const user = await requireUser();
  const t = await getTranslations("household");

  const household = await prisma.household.findUnique({
    where: { id: user.householdId },
    include: { users: { orderBy: { createdAt: "asc" } } },
  });
  if (!household) return null;

  const members = household.users;
  const ownerId = members[0]?.id;
  const canEdit = user.accessRole === "ADMIN";

  function roleBadge(m: (typeof members)[number]) {
    if (m.id === ownerId) return { label: t("roleOwner"), cls: "bg-[#131b2e] text-white" };
    if (m.accessRole === "ADMIN") return { label: t("roleMember"), cls: "bg-[#dcfce7] text-[#065f3e]" };
    return { label: t("roleViewer"), cls: "bg-[#e2e8f0] text-[#64748b]" };
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-[32px] font-bold text-[#0f172a]">{t("settingsTitle")}</h1>
          <p className="flex items-center gap-2 text-[#64748b]">
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              <path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M9 13h.01M9 17h.01M15 9h.01M15 13h.01M15 17h.01" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t("familyUnitId")}: <span className="font-semibold tracking-wide text-[#0a7c53]">{household.inviteCode}</span>
          </p>
        </div>
        {canEdit && <InviteMemberButton inviteCode={household.inviteCode} />}
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: members + roles */}
        <div className="space-y-6 lg:col-span-8">
          {/* Members */}
          <section className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#e2e8f0] bg-[#f8fafc] p-4">
              <h3 className="text-[20px] font-semibold text-[#0a7c53]">{t("membersTitle", { count: members.length })}</h3>
              <span className="rounded-full bg-[#dcfce7] px-3 py-1 text-xs font-bold text-[#065f3e]">
                {t("membersActive", { count: members.length })}
              </span>
            </div>
            <div className="divide-y divide-[#e2e8f0]">
              {members.map((m, i) => {
                const badge = roleBadge(m);
                const isSelf = m.id === user.id;
                const isOwner = m.id === ownerId;
                return (
                  <div key={m.id} className="flex items-center justify-between p-4 transition-colors hover:bg-[#f8fafc]">
                    <div className="flex items-center gap-4">
                      {m.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.image} alt="" className="h-12 w-12 rounded-full border-2 border-[#0a7c53]/20 object-cover" />
                      ) : (
                        <span className={`grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br ${AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length]} text-lg font-bold text-white`}>
                          {m.name.trim().charAt(0).toUpperCase()}
                        </span>
                      )}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-[#0f172a]">{m.name}</span>
                          {isSelf && <span className="text-xs text-[#94a3b8]">{t("you")}</span>}
                          <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badge.cls}`}>{badge.label}</span>
                        </div>
                        <p className="truncate text-sm text-[#64748b]">{m.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {isOwner && isSelf && (
                        <Link href="/profile" aria-label={t("editProfile")} className="rounded-lg p-2 text-[#64748b] transition-all hover:bg-[#dcfce7] hover:text-[#0a7c53]">
                          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                            <path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </Link>
                      )}
                      {canEdit && !isSelf && !isOwner && (
                        <>
                          <MemberAccessToggle memberId={m.id} accessRole={m.accessRole} />
                          <RemoveMemberButton memberId={m.id} name={m.name} />
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Roles & Permissions */}
          <section className="space-y-2">
            <h3 className="px-1 text-[20px] font-semibold text-[#0f172a]">{t("rolesTitle")}</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-gradient-to-br from-[#1f2a44] to-[#0b1220] p-4 text-white">
                <div className="mb-2 flex items-center gap-2">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#4edea3]" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <h4 className="font-bold">{t("ownersTitle")}</h4>
                </div>
                <ul className="space-y-2 text-sm opacity-90">
                  {[t("ownerPerm1"), t("ownerPerm2"), t("ownerPerm3")].map((p) => (
                    <li key={p} className="flex items-start gap-2">
                      <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-[#4edea3]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center gap-2">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#0a7c53]" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <h4 className="font-bold text-[#0f172a]">{t("membersRoleTitle")}</h4>
                </div>
                <ul className="space-y-2 text-sm text-[#64748b]">
                  {[t("memberPerm1"), t("memberPerm2"), t("memberPerm3")].map((p) => (
                    <li key={p} className="flex items-start gap-2">
                      <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-[#0a7c53]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        </div>

        {/* Right: settings */}
        <div className="space-y-6 lg:col-span-4">
          <HouseholdSettingsForm
            initial={{
              name: household.name,
              currency: household.currency,
              privacyMode: household.privacyMode,
              trustScoreSharing: household.trustScoreSharing,
            }}
            canEdit={canEdit}
          />
        </div>
      </div>
    </div>
  );
}
