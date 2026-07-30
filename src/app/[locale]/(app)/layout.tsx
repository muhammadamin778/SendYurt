import { getTranslations } from "next-intl/server";
import { CustomCursor } from "@/components/CustomCursor";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import { ConvaiWidget } from "@/components/ConvaiWidget";
import { VisitLogger } from "@/components/VisitLogger";
import { BankSidebar } from "@/components/bank/BankSidebar";
import { BankTopbar } from "@/components/bank/BankTopbar";
import { BankMobileNav } from "@/components/bank/BankMobileNav";
import { requireUser } from "@/lib/session";
import { isStaff } from "@/lib/permissions";

// Everything in this group is per-user, per-household data behind auth —
// it must never be statically prerendered.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const t = await getTranslations("household");
  const initial = (user.name ?? "?").trim().charAt(0).toUpperCase();
  const roleLabel = t(user.role === "SENDER" ? "roleSender" : "roleReceiver");

  return (
    <div className="bankdash flex min-h-screen w-full">
      {/* Outside the scroll container and above the sidebar, so it is the
          first thing seen on every page of a view-as session. */}
      {user.impersonating && (
        <ImpersonationBanner
          operatorName={user.impersonating.operatorName}
          targetName={user.impersonating.targetName}
          reason={user.impersonating.reason}
          minutesLeft={user.impersonating.minutesLeft}
        />
      )}
      <BankSidebar
        name={user.name ?? "SendYurt"}
        initial={initial}
        image={user.image ?? null}
        roleLabel={roleLabel}
        isAdmin={isStaff(user.adminRole)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <BankTopbar image={user.image ?? null} initial={initial} />

        {/* pb clears the fixed mobile bottom nav */}
        <main className="flex-1 px-5 py-6 pb-28 sm:px-8 lg:pb-10">{children}</main>
      </div>

      <BankMobileNav />
      <ConvaiWidget />
      <CustomCursor />
      <VisitLogger />
    </div>
  );
}
