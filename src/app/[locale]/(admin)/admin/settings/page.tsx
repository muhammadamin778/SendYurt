import { setRequestLocale } from "next-intl/server";
import { SettingsBoard, type AuditItem, type ProviderHealth } from "@/components/admin/SettingsBoard";
import { requireAdmin } from "@/lib/admin";
import { formatMoney, formatNumber } from "@/lib/format";
import { getUzsRates } from "@/lib/fx";
import { readPrisma } from "@/lib/prisma-read";

function timeAgo(d: Date): string {
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

// Maps a raw AuditLog action to the display tag + tone used by the audit list.
const ACTION_META: Record<string, { tag: string; tone: AuditItem["tone"]; verb: string }> = {
  ROLE_PROMOTION: { tag: "ROLE", tone: "primary", verb: "Admin role granted" },
  ROLE_DEMOTION: { tag: "ROLE", tone: "secondary", verb: "Admin role revoked" },
  USER_SUSPEND: { tag: "POLICY", tone: "error", verb: "User suspended" },
  USER_UNSUSPEND: { tag: "POLICY", tone: "primary", verb: "User reinstated" },
  DATA_EXPORT: { tag: "EXPORT", tone: "secondary", verb: "Data exported" },
};

// Illustrative provider status assignment (real names, mock health) — the
// design shows one stable, one lagging, one offline gateway.
const HEALTH_CYCLE: Array<{ state: ProviderHealth["state"]; latencyMs: number }> = [
  { state: "stable", latencyMs: 142 },
  { state: "lagging", latencyMs: 210 },
  { state: "offline", latencyMs: 0 },
  { state: "stable", latencyMs: 168 },
  { state: "stable", latencyMs: 121 },
];

export default async function AdminSettingsPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  await requireAdmin();

  let usdRate = "12,900.00";
  let eurRate = "13,950.00";
  let ratesLive = false;
  let providers: ProviderHealth[] = [];
  let audit: AuditItem[] = [];
  let volume24h = formatMoney(0, "UZS", "en");
  const reserveBalance = "$2,410,500.00"; // illustrative reserve pool

  try {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [fx, provs, logs, volAgg] = await Promise.all([
      getUzsRates(),
      readPrisma.remittanceProvider.findMany({ select: { name: true }, orderBy: { name: "asc" }, take: 3 }),
      readPrisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { id: true, action: true, createdAt: true, metadata: true, targetType: true, admin: { select: { name: true } } },
      }),
      readPrisma.transaction.aggregate({ where: { date: { gte: dayAgo } }, _sum: { amount: true } }),
    ]);

    ratesLive = fx.live;
    usdRate = formatNumber(fx.rates.USD ?? 12900, "en", 2);
    eurRate = formatNumber(fx.rates.EUR ?? 13950, "en", 2);

    providers = provs.map((p, i) => {
      const h = HEALTH_CYCLE[i % HEALTH_CYCLE.length];
      return { name: p.name, initial: p.name.trim().charAt(0).toUpperCase(), state: h.state, latencyMs: h.latencyMs };
    });

    audit = logs.map((l) => {
      const meta = ACTION_META[l.action] ?? { tag: "EVENT", tone: "secondary" as const, verb: l.action };
      const actor = l.admin?.name ? `by ${l.admin.name}` : "";
      const metaObj = (l.metadata ?? {}) as Record<string, unknown>;
      const chips: string[] = [];
      if (metaObj.from && metaObj.to) chips.push(`${String(metaObj.from)} → ${String(metaObj.to)}`);
      if (l.targetType) chips.push(`Target: ${l.targetType}`);
      return {
        id: l.id,
        tag: meta.tag,
        tone: meta.tone,
        title: `${meta.verb} ${actor}`.trim(),
        time: timeAgo(l.createdAt),
        detail: `Recorded action “${l.action}”${actor ? ` performed ${actor}` : ""} on ${new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(l.createdAt)}.`,
        meta: chips,
      };
    });

    volume24h = formatMoney(volAgg._sum.amount?.toNumber() ?? 0, "UZS", "en");
  } catch (e) {
    console.error("admin settings data unavailable", e);
  }

  return (
    <SettingsBoard
      usdRate={usdRate}
      eurRate={eurRate}
      ratesLive={ratesLive}
      providers={providers}
      audit={audit}
      volume24h={volume24h}
      reserveBalance={reserveBalance}
    />
  );
}
