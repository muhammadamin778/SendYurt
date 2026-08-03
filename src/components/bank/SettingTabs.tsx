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
      <div className="flex gap-4 overflow-x-auto border-b border-[#eef2f7] sm:gap-8" role="tablist">
        {tabs.map((x) => (
          <button
            key={x.id}
            type="button"
            role="tab"
            aria-selected={tab === x.id}
            onClick={() => setTab(x.id)}
            className={clsx(
              "relative -mb-px whitespace-nowrap pb-3 text-[14px] font-medium transition-colors sm:text-[15px]",
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
