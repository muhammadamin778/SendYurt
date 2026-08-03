"use client";

import { clsx } from "clsx";
import { useState } from "react";
import { useTranslations } from "next-intl";

export function SettingTabs({
  editProfile,
  preferences,
  security,
}: {
  editProfile: React.ReactNode;
  preferences: React.ReactNode;
  security: React.ReactNode;
}) {
  const t = useTranslations("bank");
  const [tab, setTab] = useState<"edit" | "prefs" | "sec">("edit");

  const tabs = [
    { id: "edit" as const, label: t("editProfile") },
    { id: "prefs" as const, label: t("preferences") },
    { id: "sec" as const, label: t("security") },
  ];

  return (
    <div>
      {/* Each tab takes an equal share of the width on phones, so three labels
          always fit exactly — no scroller and no "Securit". From sm up they
          revert to natural width, where there is room to spare. */}
      <div className="flex border-b border-[#eef2f7] sm:gap-8" role="tablist">
        {tabs.map((x) => (
          <button
            key={x.id}
            type="button"
            role="tab"
            aria-selected={tab === x.id}
            onClick={() => setTab(x.id)}
            className={clsx(
              "relative -mb-px flex-1 whitespace-nowrap pb-3 text-center text-[13px] font-medium transition-colors sm:flex-none sm:text-left sm:text-[15px]",
              tab === x.id ? "text-[#0a7c53]" : "text-[#64748b] hover:text-[#0f172a]",
            )}
          >
            {x.label}
            {tab === x.id && (
              <span className="absolute inset-x-0 -bottom-px h-[3px] rounded-full bg-[#0a7c53]" />
            )}
          </button>
        ))}
      </div>

      <div className="pt-7">
        {tab === "edit" && editProfile}
        {tab === "prefs" && preferences}
        {tab === "sec" && security}
      </div>
    </div>
  );
}
