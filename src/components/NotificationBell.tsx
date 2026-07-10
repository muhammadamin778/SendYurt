"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { formatDate, formatMoney } from "@/lib/format";

interface Item {
  id: string;
  type: string;
  payload: string;
  readAt: string | null;
  createdAt: string;
}

export function NotificationBell() {
  const t = useTranslations("notifications");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [unread, setUnread] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.items);
      setUnread(data.unreadCount);
    } catch {
      // Non-critical; bell simply stays empty.
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next) {
      await load();
      if (unread > 0) {
        // Optimistically clear the badge, then persist.
        setUnread(0);
        fetch("/api/notifications", { method: "POST" }).catch(() => {});
      }
    }
  }

  function renderMessage(item: Item): string {
    let p: Record<string, unknown> = {};
    try {
      p = JSON.parse(item.payload);
    } catch {
      return t("fallback");
    }
    switch (item.type) {
      case "REMITTANCE_LOGGED":
        return t("remittance", {
          amount: formatMoney(Number(p.amount ?? 0), String(p.currency ?? "UZS"), locale),
        });
      case "GOAL_NEAR":
        return Number(p.percent) >= 100
          ? t("goalReached", { goal: String(p.goal ?? "") })
          : t("goalNear", { goal: String(p.goal ?? ""), percent: Number(p.percent ?? 0) });
      case "SCORE_CHANGE": {
        const from = Number(p.from ?? 0);
        const to = Number(p.to ?? 0);
        return to >= from
          ? t("scoreUp", { from, to })
          : t("scoreDown", { from, to });
      }
      default:
        return t("fallback");
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={toggleOpen}
        aria-label={t("title")}
        aria-expanded={open}
        className="relative rounded-lg border border-sand-300 bg-white p-2 text-sand-800 transition-colors hover:bg-sand-100 motion-safe:active:scale-[0.95]"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M18 9a6 6 0 10-12 0c0 5-2 6-2 6h16s-2-1-2-6M10.3 19a2 2 0 003.4 0" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-terracotta-600 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="region"
          aria-label={t("title")}
          className="absolute right-0 top-11 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-sand-200 bg-white shadow-card motion-safe:animate-toast-in"
        >
          <div className="border-b border-sand-100 px-4 py-3 font-display text-sm font-bold text-samarkand-950">
            {t("title")}
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-sand-700">{t("empty")}</p>
          ) : (
            <ul className="max-h-80 divide-y divide-sand-100 overflow-y-auto">
              {items.map((item) => (
                <li
                  key={item.id}
                  className={clsx("px-4 py-3", !item.readAt && "bg-samarkand-50")}
                >
                  <p className="text-sm leading-snug text-ink">{renderMessage(item)}</p>
                  <p className="mt-1 text-xs text-sand-600">
                    {formatDate(new Date(item.createdAt), locale)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
