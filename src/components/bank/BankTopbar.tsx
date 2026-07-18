"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { BackButton } from "@/components/BackButton";
import { NotificationBell } from "@/components/NotificationBell";

function useTitle(): string {
  const pathname = usePathname();
  const nav = useTranslations("nav");
  const bank = useTranslations("bank");
  if (pathname.startsWith("/dashboard")) return bank("overview");
  if (pathname.startsWith("/rates")) return nav("rates");
  if (pathname.startsWith("/budget") || pathname.startsWith("/summary")) return nav("budget");
  if (pathname.startsWith("/trust")) return nav("trust");
  if (pathname.startsWith("/household")) return nav("household");
  if (pathname.startsWith("/help")) return nav("help");
  if (pathname.startsWith("/profile")) return bank("setting");
  return "SendYurt";
}

export function BankTopbar({
  image,
  initial,
}: {
  image: string | null;
  initial: string;
}) {
  const title = useTitle();
  const bank = useTranslations("bank");

  return (
    <header className="sticky top-0 z-40 border-b border-[#e2e8f0] bg-[#f1f5f9]/85 backdrop-blur-md supports-[backdrop-filter]:bg-[#f1f5f9]/70 print:hidden">
      <div className="flex h-[90px] items-center justify-between gap-4 px-5 sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <BackButton />
          <h1 className="truncate font-sans text-[22px] font-bold text-[#0f172a] sm:text-[28px]">
            {title}
          </h1>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <label className="relative hidden md:block">
            <span className="sr-only">{bank("search")}</span>
            <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#94a3b8]" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <circle cx="11" cy="11" r="7" /><path d="m20 20-3-3" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              placeholder={bank("search")}
              className="h-[50px] w-[200px] rounded-full border-0 bg-[#f1f5f9] pl-12 pr-4 text-[15px] text-[#0f172a] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#0a7c53]/25 xl:w-[260px]"
            />
          </label>

          <NotificationBell />

          <Link
            href="/profile"
            aria-label={bank("setting")}
            className="grid h-[50px] w-[50px] shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-[#0a7c53] to-[#34d399] font-sans text-base font-bold text-white shadow-sm transition-transform hover:scale-105"
          >
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="" className="h-full w-full object-cover" />
            ) : (
              initial
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
