import { setRequestLocale } from "next-intl/server";
import {
  SupportBoard,
  type StaffOption,
  type TicketView,
} from "@/components/admin/SupportBoard";
import { requireStaff } from "@/lib/admin";
import { nameFor } from "@/lib/mask";
import { ROLE_LABELS } from "@/lib/permissions";
import { readPrisma } from "@/lib/prisma-read";
import { isTicketStatus } from "@/lib/ticket-state";

/**
 * Support console data.
 *
 * Everything the board renders is loaded here — tickets, threads, staff desks
 * and the four counters. Nothing on that screen is illustrative any more, so
 * there is no placeholder tag left to render.
 */

export const dynamic = "force-dynamic";

export default async function AdminSupportPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  const staffUser = await requireStaff("ticket.view");
  const canSeePii = staffUser.can("customer.pii.view");

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [rows, staffRows, open, inProgress, unassigned, resolvedToday] = await Promise.all([
    readPrisma.supportTicket.findMany({
      // Unresolved first, then most recently touched — the working order.
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      take: 100,
      select: {
        id: true,
        reference: true,
        subject: true,
        category: true,
        priority: true,
        status: true,
        updatedAt: true,
        kycRequestedAt: true,
        assignedToId: true,
        householdId: true,
        assignedTo: { select: { name: true } },
        user: { select: { id: true, name: true } },
        messages: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            kind: true,
            body: true,
            createdAt: true,
            author: { select: { name: true } },
          },
        },
      },
    }),
    readPrisma.user.findMany({
      where: { adminRole: { in: ["SUPPORT", "ADMIN", "SUPER_ADMIN"] }, suspended: false },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        adminRole: true,
        _count: { select: { ticketsAssigned: true } },
      },
    }),
    readPrisma.supportTicket.count({ where: { status: "OPEN" } }),
    readPrisma.supportTicket.count({ where: { status: "IN_PROGRESS" } }),
    readPrisma.supportTicket.count({
      where: { status: { in: ["OPEN", "IN_PROGRESS"] }, assignedToId: null },
    }),
    readPrisma.supportTicket.count({
      where: { status: "RESOLVED", resolvedAt: { gte: startOfToday } },
    }),
  ]);

  // Latest Trust snapshot per household, for the detail panel. One query for
  // the whole page rather than `getTrustData` per ticket, which would recompute
  // a score from the ledger for every row on screen.
  const householdIds = Array.from(new Set(rows.map((r) => r.householdId)));
  const snapshots = await readPrisma.trustScoreSnapshot.findMany({
    where: { householdId: { in: householdIds } },
    orderBy: { calculatedAt: "desc" },
    select: { householdId: true, score: true },
  });
  const trustByHousehold = new Map<string, number>();
  for (const s of snapshots) {
    if (!trustByHousehold.has(s.householdId)) trustByHousehold.set(s.householdId, s.score);
  }

  const tickets: TicketView[] = rows.map((r) => {
    // The first customer message doubles as the summary — a ticket has no
    // separate description field, and inventing one would mean writing copy
    // the customer never wrote.
    const firstCustomer = r.messages.find((m) => m.kind === "CUSTOMER");
    return {
      id: r.id,
      reference: r.reference,
      customerName: nameFor(r.user.name, canSeePii),
      customerId: r.user.id,
      category: r.category,
      status: isTicketStatus(r.status) ? r.status : "OPEN",
      priority: (r.priority as TicketView["priority"]) ?? "MEDIUM",
      subject: r.subject,
      summary: firstCustomer?.body ?? "No description was provided with this ticket.",
      trust: trustByHousehold.get(r.householdId) ?? null,
      assignedToId: r.assignedToId,
      // Staff names are never masked to other staff — an agent has to know
      // which colleague owns a ticket.
      assignedToName: r.assignedTo?.name ?? null,
      updatedAtIso: r.updatedAt.toISOString(),
      kycRequestedAtIso: r.kycRequestedAt?.toISOString() ?? null,
      messages: r.messages.map((m) => ({
        id: m.id,
        kind: m.kind as TicketView["messages"][number]["kind"],
        body: m.body,
        authorName: m.author?.name ?? null,
        createdAtIso: m.createdAt.toISOString(),
      })),
    };
  });

  const staff: StaffOption[] = staffRows.map((s) => ({
    id: s.id,
    name: s.name,
    roleLabel: ROLE_LABELS[s.adminRole],
    openCount: s._count.ticketsAssigned,
  }));

  return (
    <SupportBoard
      tickets={tickets}
      staff={staff}
      stats={{ open, inProgress, unassigned, resolvedToday }}
      permissions={{
        assign: staffUser.can("ticket.assign"),
        reply: staffUser.can("ticket.reply"),
        resolve: staffUser.can("ticket.resolve"),
        internalNote: staffUser.can("ticket.note.internal"),
      }}
    />
  );
}
