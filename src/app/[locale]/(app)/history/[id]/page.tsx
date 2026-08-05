import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { PrintReceiptButton } from "@/components/history/PrintReceiptButton";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { isCurrencyCode, toMajor, toMinor } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "receipt" });
  return { title: t("title") };
}

const STATUS_STYLE: Record<string, string> = {
  completed: "bg-[#dcfce7] text-[#065f3e]",
  pending: "bg-[#ffddb8] text-[#b87500]",
  processing: "bg-[#ffddb8] text-[#b87500]",
  failed: "bg-[#ffdad6] text-[#93000a]",
  disputed: "bg-[#fef3c7] text-[#92400e]",
  reversed: "bg-[#e2e8f0] text-[#475569]",
};

type StatusKey = "statusCompleted" | "statusPending" | "statusFailed" | "statusDisputed" | "statusReversed";
function statusKey(status: string): StatusKey {
  switch (status.toLowerCase()) {
    case "completed": return "statusCompleted";
    case "failed": return "statusFailed";
    case "disputed": return "statusDisputed";
    case "reversed": return "statusReversed";
    default: return "statusPending";
  }
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#eef2f7] py-3 last:border-0">
      <span className="text-[13px] text-[#64748b]">{label}</span>
      <span className="text-right text-[14px] font-medium text-[#0f172a]">{children}</span>
    </div>
  );
}

export default async function TransactionReceiptPage({
  params: { locale, id },
}: {
  params: { locale: string; id: string };
}) {
  setRequestLocale(locale);
  const user = await requireUser();
  const t = await getTranslations("receipt");
  const currentLocale = await getLocale();

  // Household-scoped so a user can only ever open their own family's records.
  const tx = await prisma.transaction.findFirst({
    where: { id, householdId: user.householdId, type: { in: ["REMITTANCE", "SAVINGS"] } },
    include: {
      sender: { select: { name: true } },
      receiver: { select: { name: true } },
      provider: { select: { name: true } },
      events: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!tx) notFound();

  const isRemittance = tx.type === "REMITTANCE";
  const amount = toMinor(tx.amount);
  const src =
    tx.sourceAmount != null && tx.sourceCurrency
      ? { amount: toMinor(tx.sourceAmount), currency: tx.sourceCurrency }
      : null;
  const rate =
    src && isCurrencyCode(src.currency) && toMajor(src.amount, src.currency) > 0
      ? toMajor(amount, "UZS") / toMajor(src.amount, src.currency)
      : null;

  const typeLabel = isRemittance ? t("typeRemittance") : t("typeSavings");
  const ref = tx.id.slice(-10).toUpperCase();

  return (
    <div className="mx-auto max-w-2xl">
      {/* Print-only stylesheet: when printing, show just the receipt card. */}
      <style
        dangerouslySetInnerHTML={{
          __html:
            "@media print{body *{visibility:hidden!important}#sy-receipt,#sy-receipt *{visibility:visible!important}#sy-receipt{position:absolute;left:0;top:0;width:100%;box-shadow:none!important;border:none!important}.no-print{display:none!important}}",
        }}
      />

      <div className="no-print mb-5 flex items-center justify-between">
        <Link href="/history" className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[#64748b] transition-colors hover:text-[#0a7c53]">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true"><path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          {t("back")}
        </Link>
        <PrintReceiptButton label={t("print")} />
      </div>

      <div id="sy-receipt" className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#eef2f7] bg-gradient-to-br from-[#1f2a44] to-[#0b1220] px-6 py-5 text-white">
          <div>
            <p className="text-[13px] font-semibold uppercase tracking-wide text-[#9df4c8]">SendYurt</p>
            <p className="mt-0.5 text-[13px] text-white/70">{t("title")}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${STATUS_STYLE[tx.status.toLowerCase()] ?? STATUS_STYLE.pending}`}>
            {t(statusKey(tx.status))}
          </span>
        </div>

        {/* Amount hero */}
        <div className="px-6 py-6 text-center">
          <p className="text-[13px] text-[#64748b]">{isRemittance ? t("recipientReceives") : t("amountLabel")}</p>
          <p className="mt-1 text-[34px] font-bold leading-none tracking-tight tabular-nums text-[#0f172a]">
            {formatMoney(amount, tx.currency, currentLocale)}
          </p>
          {isRemittance && src && (
            <p className="mt-2 text-[13px] text-[#64748b]">
              {t("amountSent")}: <span className="font-semibold text-[#0f172a]">{formatMoney(src.amount, src.currency, currentLocale)}</span>
            </p>
          )}
        </div>

        {/* Details */}
        <div className="px-6 pb-2">
          <Row label={t("type")}>{typeLabel}</Row>
          {isRemittance && (
            <Row label={t("recipient")}>{tx.receiver?.name ?? "—"}</Row>
          )}
          <Row label={t("sender")}>{tx.sender?.name ?? t("system")}</Row>
          {isRemittance && tx.provider && <Row label={t("provider")}>{tx.provider.name}</Row>}
          {rate != null && src && (
            <Row label={t("exchangeRate")}>
              1 {src.currency} = {formatNumber(rate, currentLocale, src.currency === "KZT" ? 1 : 0)} UZS
            </Row>
          )}
          <Row label={t("date")}>{formatDate(tx.date, currentLocale)}</Row>
          <Row label={t("reference")}><span className="font-mono tracking-wide">{ref}</span></Row>
          {tx.note && <Row label={t("note")}>{tx.note}</Row>}
        </div>

        {/* Status timeline */}
        {tx.events.length > 0 && (
          <div className="border-t border-[#eef2f7] px-6 py-5">
            <p className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-[#64748b]">{t("timeline")}</p>
            <ol className="space-y-3">
              {tx.events.map((ev, i) => (
                <li key={ev.id} className="flex gap-3">
                  <span className="mt-0.5 flex flex-col items-center">
                    <span className={`h-2.5 w-2.5 rounded-full ${i === tx.events.length - 1 ? "bg-[#0a7c53]" : "bg-[#cbd5e1]"}`} />
                    {i < tx.events.length - 1 && <span className="mt-1 h-6 w-px bg-[#e2e8f0]" />}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium text-[#0f172a]">{t(statusKey(ev.toStatus))}</p>
                    <p className="text-[12px] text-[#94a3b8]">{formatDate(ev.createdAt, currentLocale)}{ev.note ? ` · ${ev.note}` : ""}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-[#eef2f7] bg-[#f8fafc] px-6 py-4 text-center">
          <p className="flex items-center justify-center gap-1.5 text-[12px] text-[#94a3b8]">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 118 0v3" strokeLinecap="round" /></svg>
            {t("footer")}
          </p>
        </div>
      </div>
    </div>
  );
}
