import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SignOutPanel } from "@/components/SignOutPanel";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SecurityToggle } from "@/components/profile/SecurityToggle";
import { EditProfileForm, type ReadOnlyField } from "@/components/bank/EditProfileForm";
import { SettingTabs } from "@/components/bank/SettingTabs";
import { prisma } from "@/lib/prisma";
import { createServerSupabase } from "@/lib/supabase/server";
import { requireUser } from "@/lib/session";
import { isStaff } from "@/lib/permissions";
import { NAV, NavGlyph } from "@/components/bank/nav-items";

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "profile" });
  return { title: t("title") };
}

const LOCALE_LABELS: Record<string, string> = { uz: "Oʻzbekcha", ru: "Русский", en: "English" };

/* Light settings row --------------------------------------------------- */
function Row({
  icon,
  title,
  desc,
  trailing,
}: {
  icon: string;
  title: string;
  desc?: string;
  trailing: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="flex min-w-0 items-center gap-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#f1f5f9] text-[#0a7c53]">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d={icon} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-[#0f172a]">{title}</p>
          {desc && <p className="truncate text-[13px] text-[#94a3b8]">{desc}</p>}
        </div>
      </div>
      <div className="shrink-0">{trailing}</div>
    </div>
  );
}

export default async function ProfilePage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  const user = await requireUser();
  const t = await getTranslations("bank");
  const tp = await getTranslations("profile");
  const currentLocale = await getLocale();

  const household = await prisma.household.findUnique({
    where: { id: user.householdId },
    select: { name: true, inviteCode: true, users: { orderBy: { createdAt: "asc" }, select: { id: true, name: true } } },
  });

  /**
   * Real recent activity for the Security tab.
   *
   * Read under the user's own Supabase session, so RLS returns only their
   * rows — a customer can never see anyone else's. Distinct paths, newest
   * first, so a burst of reloads on one page does not fill the list.
   */
  const supabase = createServerSupabase();
  const { data: activityRows } = await supabase
    .from("activity_logs")
    .select("id,path,created_at")
    .order("created_at", { ascending: false })
    .limit(25);

  const seenPaths = new Set<string>();
  const recentActivity = (activityRows ?? [])
    .filter((r) => {
      const key = r.path ?? "/";
      if (seenPaths.has(key)) return false;
      seenPaths.add(key);
      return true;
    })
    .slice(0, 5)
    .map((r) => ({
      id: String(r.id),
      path: r.path ?? "/",
      when: new Date(r.created_at as string).toLocaleString(currentLocale, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    }));

  const isSender = user.role === "SENDER";
  const initial = (user.name ?? "?").trim().charAt(0).toUpperCase();
  const roleLabel = isSender ? tp("roleSenderTitle") : tp("roleReceiverTitle");

  const readOnlyFields: ReadOnlyField[] = [
    { label: t("userName"), value: (user.email ?? "").split("@")[0] || (user.name ?? "") },
    { label: t("email"), value: user.email ?? "", type: "email" },
    { label: t("role"), value: roleLabel },
    { label: t("household"), value: household?.name ?? "—" },
    { label: t("inviteCode"), value: household?.inviteCode ?? "—" },
    { label: t("currency"), value: "UZS · soʻm" },
  ];

  const editProfile = (
    <EditProfileForm
      image={user.image ?? null}
      initial={initial}
      name={user.name ?? ""}
      nameLabel={t("yourName")}
      fields={readOnlyFields}
      save={t("save")}
    />
  );

  /**
   * Destinations the bottom bar has no room for.
   *
   * The mobile drawer that used to carry these is gone, and the sidebar that
   * carries them on a laptop is hidden under lg — so without this block
   * Family, History and Help would have no route on a phone at all. Settings
   * is reachable from the avatar in the header, which makes it the one place
   * every screen can get to.
   */
  const bottomBarHrefs = new Set(["/dashboard", "/wallet", "/rates", "/budget", "/trust", "/support"]);
  const moreLinks = NAV.filter((item) => !bottomBarHrefs.has(item.href));

  const preferences = (
    <div className="max-w-2xl">
      <section className="mb-6 lg:hidden">
        <h3 className="text-[15px] font-semibold text-[#0f172a]">{tp("moreTitle")}</h3>
        <p className="mb-3 text-xs text-[#94a3b8]">{tp("moreDesc")}</p>
        <ul className="grid grid-cols-2 gap-2">
          {moreLinks.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex items-center gap-2.5 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3 py-3 text-[14px] font-medium text-[#0f172a] transition-colors hover:bg-[#f1f5f9]"
              >
                <span className="text-[#0a7c53]"><NavGlyph name={item.icon} /></span>
                <span className="truncate">{t(item.key)}</span>
              </Link>
            </li>
          ))}
          {isStaff(user.adminRole) && (
            <li className="col-span-2">
              <Link
                href="/admin"
                className="flex items-center justify-center gap-2 rounded-xl bg-[#0f172a] px-3 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-[#1f2a44]"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6zM9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Admin panel
              </Link>
            </li>
          )}
        </ul>
      </section>

      <div className="divide-y divide-[#eef2f7]">
      <Row icon="M3 5h12M9 3v2m1.5 14L15 9l4.5 10M12 19h6M5 9c2.5 4 6 7 10 9" title={tp("language")} desc={LOCALE_LABELS[currentLocale]} trailing={<LanguageSwitcher />} />
      <Row icon="M12 3v2m0 14v2M5.6 5.6l1.4 1.4m10 10l1.4 1.4M3 12h2m14 0h2M5.6 18.4l1.4-1.4m10-10l1.4-1.4M12 8a4 4 0 100 8 4 4 0 000-8z" title={tp("theme")} trailing={<ThemeToggle />} />
      <Row icon="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" title={tp("currency")} desc="UZS · soʻm" trailing={<span className="rounded-full bg-[#dcfce7] px-3 py-1 text-[13px] font-semibold text-[#0a7c53]">UZS</span>} />
      <Row icon="M18 9a6 6 0 10-12 0c0 5-2 6-2 6h16s-2-1-2-6M10.3 19a2 2 0 003.4 0" title={tp("notifications")} desc={tp("notificationsOn")} trailing={<span className="rounded-full bg-[#dcfce7] px-3 py-1 text-[13px] font-semibold text-[#059669]">{tp("on")}</span>} />
      </div>
    </div>
  );

  const security = (
    <div className="w-full space-y-8">
      {/* Password Management */}
      <section>
        <h3 className="mb-3 text-[20px] font-semibold text-[#0f172a]">{tp("secPasswordMgmt")}</h3>
        <div className="flex items-center justify-between rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4">
          <div>
            <p className="text-[15px] font-medium text-[#0f172a]">{tp("secChangePassword")}</p>
            <p className="text-xs text-[#94a3b8]">{tp("secChangeDesc")}</p>
          </div>
          <Link href="/forgot-password" className="text-sm font-semibold text-[#0a7c53] hover:underline">{tp("secUpdate")}</Link>
        </div>
      </section>

      {/* Two-Factor Authentication */}
      <section>
        <h3 className="mb-3 text-[20px] font-semibold text-[#0f172a]">{tp("secTwoFactor")}</h3>
        <div className="flex items-center justify-between rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4">
          <div>
            <p className="text-[15px] font-medium text-[#0f172a]">{tp("sec2faState")}</p>
            <p className="text-xs text-[#94a3b8]">{tp("sec2faDesc")}</p>
          </div>
          <SecurityToggle defaultOn label={tp("secTwoFactor")} />
        </div>
      </section>

      {/* Login Activity — real rows from the account's own activity log.
          It records user_id, email, path and a timestamp; there is no user
          agent and no IP, so the device names and "Tashkent, Uzbekistan"
          that used to sit here were invented. Showing a fabricated device on
          a security screen is worse than showing nothing: it is exactly the
          panel someone checks to see whether an account was used by someone
          else. */}
      <section>
        <h3 className="mb-3 text-[20px] font-semibold text-[#0f172a]">{tp("secLoginActivity")}</h3>
        {recentActivity.length === 0 ? (
          <p className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4 text-sm text-[#94a3b8]">
            {tp("secActivityEmpty")}
          </p>
        ) : (
          <div className="space-y-2">
            {recentActivity.map((a) => (
              <div key={a.id} className="flex items-center gap-3 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4">
                <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-[#64748b]" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                  <path d="M3 12a9 9 0 109-9 9 9 0 00-8 5M3 4v4h4M12 8v4l3 2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium text-[#0f172a]">{a.path}</p>
                  <p className="text-xs text-[#94a3b8]">{a.when}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="mt-2 text-xs leading-relaxed text-[#94a3b8]">{tp("secActivityNote")}</p>
      </section>

      {/* Account Privacy */}
      <section>
        <h3 className="mb-3 text-[20px] font-semibold text-[#0f172a]">{tp("secPrivacy")}</h3>
        <div className="flex items-center justify-between rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4">
          <div>
            <p className="text-[15px] font-medium text-[#0f172a]">{tp("secHideSavings")}</p>
            <p className="text-xs text-[#94a3b8]">{tp("secHideSavingsDesc")}</p>
          </div>
          <SecurityToggle label={tp("secHideSavings")} />
        </div>
      </section>

      <SignOutPanel />
    </div>
  );

  const memberCount = household?.users.length ?? 1;
  const trustLevel = memberCount >= 3 ? "Pro" : memberCount >= 2 ? "Plus" : "Basic";

  return (
    <div className="mx-auto max-w-[1180px] space-y-6">
      <div className="bank-card px-6 py-7 sm:px-10 sm:py-9">
        <SettingTabs editProfile={editProfile} preferences={preferences} security={security} />
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="flex items-center gap-4 rounded-xl border border-[#e2e8f0] bg-[#f2f4f6] p-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#dcfce7] text-[#0a7c53]">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6zM9.5 12a2.5 2.5 0 105 0 2.5 2.5 0 00-5 0z" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
          <div>
            <h4 className="text-sm font-semibold text-[#0f172a]">{tp("cardTrustLevel", { level: trustLevel })}</h4>
            <p className="text-xs text-[#94a3b8]">{tp("cardVerifiedBy", { count: memberCount })}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl border border-[#e2e8f0] bg-[#f2f4f6] p-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#ffddb8] text-[#b87500]">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M6 11V8a6 6 0 1112 0M5 11h14v10H5zM12 15v2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
          <div>
            <h4 className="text-sm font-semibold text-[#0f172a]">{tp("cardSecure")}</h4>
            <p className="text-xs text-[#94a3b8]">{tp("cardSecureDesc")}</p>
          </div>
        </div>
        <Link href="/support" className="flex items-center gap-4 rounded-xl bg-gradient-to-br from-[#1f2a44] to-[#0b1220] p-4 transition-transform hover:-translate-y-0.5">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/10 text-[#4edea3]">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M9.5 9.3a2.5 2.5 0 114.1 1.9c-.8.7-1.6 1.2-1.6 2.3M12 16.8v.2" strokeLinecap="round" /></svg>
          </span>
          <div>
            <h4 className="text-sm font-semibold text-white">{tp("cardNeedHelp")}</h4>
            <p className="text-xs text-[#bec6e0]">{tp("cardHelpDesc")}</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
