"use server";

import { assertAdmin } from "@/lib/admin";
import { logAudit, notifyAudit } from "@/lib/audit";
import { formatMoney } from "@/lib/format";
import { toMinor } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { readPrisma } from "@/lib/prisma-read";

/**
 * Audited CSV exports.
 *
 * Exporting customer data is a privileged act, so it runs on the server and
 * writes a `DATA_EXPORT` audit row. The previous client-side implementation
 * did neither: it serialised only the ~10 rows already on screen and left no
 * trace that anyone had taken the data — despite `DATA_EXPORT` already
 * existing in the AuditAction union.
 *
 * Returns the CSV as a string; the client turns it into a download. That keeps
 * the row limit and the audit on the server where they can't be bypassed.
 */

export type ExportResult =
  | { ok: true; filename: string; csv: string }
  | { ok: false; error: string };

/** Hard cap so a single click can't stream the whole table into memory. */
const MAX_ROWS = 5_000;

function csvEscape(value: unknown): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function toCsv(header: string[], rows: unknown[][]): string {
  return [header.map(csvEscape).join(","), ...rows.map((r) => r.map(csvEscape).join(","))].join("\r\n");
}

function stamp(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Every user matching the caller's current filter — not just the visible page.
 * `status` mirrors the filter on the users page.
 */
export async function exportUsersCsv(input: unknown): Promise<ExportResult> {
  try {
    const { adminId } = await assertAdmin();

    const status = typeof input === "string" ? input : undefined;
    const where =
      status === "flagged"
        ? { suspended: true }
        : status === "pending"
          ? { suspended: false, onboardedAt: null }
          : status === "verified"
            ? { suspended: false, onboardedAt: { not: null } }
            : {};

    const users = await readPrisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: MAX_ROWS,
      select: {
        name: true,
        email: true,
        role: true,
        accessRole: true,
        adminRole: true,
        suspended: true,
        onboardedAt: true,
        createdAt: true,
      },
    });

    const csv = toCsv(
      ["Name", "Email", "Family role", "Household access", "Platform role", "Status", "Joined"],
      users.map((u) => [
        u.name,
        u.email,
        u.role,
        u.accessRole,
        u.adminRole,
        u.suspended ? "suspended" : u.onboardedAt ? "verified" : "pending",
        u.createdAt.toISOString().slice(0, 10),
      ]),
    );

    await logAudit(prisma, {
      action: "DATA_EXPORT",
      adminId,
      targetType: "User",
      metadata: { export: "users", statusFilter: status ?? "all", rows: users.length },
    });
    await notifyAudit({ action: "DATA_EXPORT", adminId, targetType: "User" });

    return { ok: true, filename: `sendyurt-users-${stamp()}.csv`, csv };
  } catch (e) {
    return toResult(e, "exportUsersCsv");
  }
}

/**
 * Operations snapshot for the dashboard's "Export Report": corridor volumes
 * plus the most recent transactions, both from real data.
 */
export async function exportOperationsReport(): Promise<ExportResult> {
  try {
    const { adminId } = await assertAdmin();

    const [corridors, recent] = await Promise.all([
      readPrisma.transaction.groupBy({
        by: ["sourceCurrency"],
        where: { sourceCurrency: { not: null }, status: "COMPLETED" },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      readPrisma.transaction.findMany({
        orderBy: { date: "desc" },
        take: MAX_ROWS,
        select: {
          id: true,
          type: true,
          status: true,
          amount: true,
          currency: true,
          sourceCurrency: true,
          date: true,
        },
      }),
    ]);

    const corridorCsv = toCsv(
      ["Corridor", "Transfers", "Volume (UZS)"],
      corridors
        .map((c) => ({
          src: c.sourceCurrency ?? "—",
          count: c._count._all,
          volume: c._sum.amount == null ? 0 : toMinor(c._sum.amount),
        }))
        .sort((a, b) => b.volume - a.volume)
        .map((c) => [`${c.src} → UZS`, c.count, formatMoney(c.volume as never, "UZS", "en")]),
    );

    const txCsv = toCsv(
      ["Transaction ID", "Type", "Status", "Amount", "Currency", "Corridor", "Date"],
      recent.map((t) => [
        t.id,
        t.type,
        t.status,
        formatMoney(toMinor(t.amount), t.currency, "en"),
        t.currency,
        t.sourceCurrency ? `${t.sourceCurrency} → UZS` : "—",
        t.date.toISOString(),
      ]),
    );

    const csv = `Corridor volumes\r\n${corridorCsv}\r\n\r\nTransactions\r\n${txCsv}`;

    await logAudit(prisma, {
      action: "DATA_EXPORT",
      adminId,
      targetType: "Transaction",
      metadata: { export: "operations", corridors: corridors.length, transactions: recent.length },
    });
    await notifyAudit({ action: "DATA_EXPORT", adminId, targetType: "Transaction" });

    return { ok: true, filename: `sendyurt-operations-${stamp()}.csv`, csv };
  } catch (e) {
    return toResult(e, "exportOperationsReport");
  }
}

function toResult(e: unknown, label: string): ExportResult {
  if (e instanceof Error && (e.message === "unauthorized" || e.message === "forbidden")) {
    return { ok: false, error: e.message };
  }
  console.error(`${label} failed`, e);
  return { ok: false, error: "server" };
}
