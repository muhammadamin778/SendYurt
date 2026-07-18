"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";

/**
 * Right-hand hero for the two-pane auth shell: the SendYurt 3D yurt render
 * (self-hosted in /public) plus a per-page caption — the login page gets its
 * own line, register/forgot share the headline + subtitle.
 */
export function AuthHero() {
  const t = useTranslations("auth");
  const pathname = usePathname();
  const isLogin = pathname.includes("/login");

  return (
    <div className="relative z-10 flex w-full max-w-[440px] flex-col items-center text-center">
      <div className="w-full overflow-hidden rounded-[28px] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.55)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/auth-hero.jpg" alt="SendYurt" className="h-auto w-full scale-105 object-cover" />
      </div>
      {isLogin ? (
        <p className="mt-11 max-w-sm text-[17px] leading-relaxed text-white/90">{t("heroLogin")}</p>
      ) : (
        <div className="mt-10">
          <p className="font-display text-[30px] font-bold leading-tight text-white">{t("heroTitle")}</p>
          <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-white/80">{t("heroSub")}</p>
        </div>
      )}
    </div>
  );
}
