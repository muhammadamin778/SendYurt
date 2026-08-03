"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertPermission } from "@/lib/admin";
import { currentIp, logAudit, notifyAudit, type AuditAction, type AuditEntry } from "@/lib/audit";
import { isStaff } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { byLightestLoad, planAssignments } from "@/lib/ticket-assignment";
import {
  isTicketStatus,
  nextTicketStatus,
  TICKET_EVENT_PERMISSION,
  type TicketEvent,
} from "@/lib/ticket-state";
import type { Permission } from "@/lib/permissions";

/**
 * The four controls on the support console, backed for the first time.
 *
 * Shape follows `transitionTransaction`: guard → parse → validate the move
 * against the pure state table → one transaction that writes the change, the
 * thread entry and the audit row together → notify after it commits.
 *
 * Every action appends a `TicketMessage`, not just a status change. A ticket
 * whose status moved with no explanation in the thread is the thing that makes
 * a support history unreadable a month later.
 */

export type ActionResult = { ok: true } | { ok: false; error: string };

const KNOWN_ERRORS = new Set([
  "unauthorized",
  "forbidden",
  "read_only_session",
  "not_found",
  "illegal_transition",
  "invalid_assignee",
  "empty_body",
]);

function toResult(e: unknown): ActionResult {
  if (e instanceof Error && KNOWN_ERRORS.has(e.message)) {
    return { ok: false, error: e.message };
  }
  console.error("ticket action failed", e);
  return { ok: false, error: "server" };
}

const AUDIT_FOR: Record<TicketEvent, AuditAction> = {
  ASSIGN: "TICKET_ASSIGN",
  REQUEST_KYC: "TICKET_KYC_REQUEST",
  REPLY: "TICKET_REPLY",
  RESOLVE: "TICKET_RESOLVE",
  REOPEN: "TICKET_REOPEN",
};

/**
 * Shared prologue: authorize the event, load the ticket, and check the move is
 * legal from its current status.
 *
 * Authorization runs BEFORE the ticket is read, so an unauthorized caller
 * cannot use "not_found" versus "illegal_transition" to learn which ticket ids
 * exist.
 */
async function prepare(event: TicketEvent, ticketId: string) {
  const { adminId, role } = await assertPermission(
    TICKET_EVENT_PERMISSION[event] as Permission,
  );

  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    select: { id: true, reference: true, status: true, userId: true, assignedToId: true },
  });
  if (!ticket) throw new Error("not_found");
  if (!isTicketStatus(ticket.status)) throw new Error("illegal_transition");

  const next = nextTicketStatus(ticket.status, event);
  if (!next) throw new Error("illegal_transition");

  return { adminId, role, ticket, next };
}

/** Builds the audit entry every action shares, so the fields stay uniform. */
function entryFor(
  event: TicketEvent,
  adminId: string,
  role: string,
  ticket: { id: string; reference: string; status: string; userId: string },
  next: string,
  ip: string | null,
  metadata: Record<string, unknown>,
): AuditEntry {
  return {
    action: AUDIT_FOR[event],
    adminId,
    role,
    targetUserId: ticket.userId,
    targetType: "SupportTicket",
    ip,
    before: { status: ticket.status },
    after: { status: next },
    metadata: { ticketId: ticket.id, reference: ticket.reference, ...metadata },
  };
}

const assignSchema = z.object({
  ticketId: z.string().min(1),
  /** Null hands the ticket back to the unassigned queue. */
  assigneeId: z.string().min(1).nullable(),
});

/**
 * Put a ticket on someone's desk.
 *
 * The assignee must be staff. Assigning to a customer would put a ticket in a
 * queue nobody can open and hand them a view of another household's problem.
 */
export async function assignTicket(input: unknown): Promise<ActionResult> {
  try {
    const parsed = assignSchema.safeParse(input);
    if (!parsed.success) throw new Error("not_found");
    const { ticketId, assigneeId } = parsed.data;

    const { adminId, role, ticket, next } = await prepare("ASSIGN", ticketId);

    let assigneeName = "the unassigned queue";
    if (assigneeId) {
      const assignee = await prisma.user.findUnique({
        where: { id: assigneeId },
        select: { id: true, name: true, adminRole: true, suspended: true },
      });
      if (!assignee || assignee.suspended || !isStaff(assignee.adminRole)) {
        throw new Error("invalid_assignee");
      }
      assigneeName = assignee.name;
    }

    const ip = await currentIp();
    const entry = entryFor("ASSIGN", adminId, role, ticket, next, ip, {
      from: ticket.assignedToId,
      to: assigneeId,
    });

    await prisma.$transaction(async (tx) => {
      await tx.supportTicket.update({
        where: { id: ticket.id },
        data: { assignedToId: assigneeId, status: next },
      });
      await tx.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          authorId: adminId,
          kind: "SYSTEM",
          body: `Assigned to ${assigneeName}.`,
        },
      });
      await logAudit(tx, entry);
    });

    await notifyAudit(entry);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}

const ticketOnlySchema = z.object({ ticketId: z.string().min(1) });

/**
 * Ask the customer for identity documents.
 *
 * There is no KYC model in this build, so `kycRequestedAt` plus the thread
 * entry IS the record — deliberately, rather than pretending a verification
 * pipeline exists. When a real one lands this timestamp is what it backfills
 * from.
 */
export async function requestKyc(input: unknown): Promise<ActionResult> {
  try {
    const parsed = ticketOnlySchema.safeParse(input);
    if (!parsed.success) throw new Error("not_found");

    const { adminId, role, ticket, next } = await prepare("REQUEST_KYC", parsed.data.ticketId);
    const requestedAt = new Date();
    const ip = await currentIp();
    const entry = entryFor("REQUEST_KYC", adminId, role, ticket, next, ip, {
      requestedAt: requestedAt.toISOString(),
    });

    await prisma.$transaction(async (tx) => {
      await tx.supportTicket.update({
        where: { id: ticket.id },
        data: { kycRequestedAt: requestedAt, status: next },
      });
      await tx.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          authorId: adminId,
          kind: "SYSTEM",
          body: "Identity documents requested from the customer.",
        },
      });
      await logAudit(tx, entry);
    });

    await notifyAudit(entry);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}

/** Close a ticket. RESOLVED is terminal until someone reopens it. */
export async function resolveTicket(input: unknown): Promise<ActionResult> {
  try {
    const parsed = ticketOnlySchema.safeParse(input);
    if (!parsed.success) throw new Error("not_found");

    const { adminId, role, ticket, next } = await prepare("RESOLVE", parsed.data.ticketId);
    const resolvedAt = new Date();
    const ip = await currentIp();
    const entry = entryFor("RESOLVE", adminId, role, ticket, next, ip, {
      resolvedAt: resolvedAt.toISOString(),
    });

    await prisma.$transaction(async (tx) => {
      await tx.supportTicket.update({
        where: { id: ticket.id },
        data: { status: next, resolvedAt, resolvedById: adminId },
      });
      await tx.ticketMessage.create({
        data: { ticketId: ticket.id, authorId: adminId, kind: "SYSTEM", body: "Ticket resolved." },
      });
      await logAudit(tx, entry);
    });

    await notifyAudit(entry);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}

/** Reopen a resolved ticket, clearing the resolution stamps. */
export async function reopenTicket(input: unknown): Promise<ActionResult> {
  try {
    const parsed = ticketOnlySchema.safeParse(input);
    if (!parsed.success) throw new Error("not_found");

    const { adminId, role, ticket, next } = await prepare("REOPEN", parsed.data.ticketId);
    const ip = await currentIp();
    const entry = entryFor("REOPEN", adminId, role, ticket, next, ip, {});

    await prisma.$transaction(async (tx) => {
      await tx.supportTicket.update({
        where: { id: ticket.id },
        data: { status: next, resolvedAt: null, resolvedById: null },
      });
      await tx.ticketMessage.create({
        data: { ticketId: ticket.id, authorId: adminId, kind: "SYSTEM", body: "Ticket reopened." },
      });
      await logAudit(tx, entry);
    });

    await notifyAudit(entry);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}

/**
 * Spread every unresolved ticket evenly across the staff on shift.
 *
 * With one person on shift they take everything; with five, 23 tickets go
 * 5/5/5/4/4 — the split computed by `planAssignments`, which the console also
 * uses to preview it, so what an operator is shown is what gets applied.
 *
 * Deliberately a button, not a background job. Reassignment moves work someone
 * may already be mid-way through, so it should be a decision with a name
 * against it rather than something that happens silently overnight.
 *
 * Resolved tickets are left alone: they stay with whoever closed them, because
 * that history is the record of who handled what.
 */
export async function rebalanceTickets(): Promise<ActionResult> {
  try {
    const { adminId, role } = await assertPermission("ticket.assign");

    const [staff, tickets] = await Promise.all([
      prisma.user.findMany({
        where: { adminRole: { in: ["SUPPORT", "ADMIN", "SUPER_ADMIN"] }, suspended: false },
        select: { id: true, _count: { select: { ticketsAssigned: true } } },
      }),
      prisma.supportTicket.findMany({
        where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
        orderBy: { createdAt: "asc" }, // oldest first — longest-waiting placed first
        select: { id: true, assignedToId: true },
      }),
    ]);

    if (staff.length === 0) throw new Error("invalid_assignee");

    // Order people least-busy first so the surplus lands where there is room.
    const staffIds = byLightestLoad(
      staff.map((s) => ({ staffId: s.id, open: s._count.ticketsAssigned })),
    );
    const plan = planAssignments(
      tickets.map((t) => t.id),
      staffIds,
    );

    // Only write the ones that actually move — a no-op rebalance should not
    // churn `updatedAt` on the whole queue and reorder the console.
    const current = new Map(tickets.map((t) => [t.id, t.assignedToId]));
    const changes = plan.filter((a) => current.get(a.ticketId) !== a.staffId);

    const ip = await currentIp();
    const entry: AuditEntry = {
      action: "TICKET_ASSIGN",
      adminId,
      role,
      targetType: "SupportTicket",
      ip,
      before: { unassigned: tickets.filter((t) => !t.assignedToId).length },
      after: { moved: changes.length, staffOnShift: staffIds.length },
      metadata: {
        rebalance: true,
        ticketCount: tickets.length,
        shape: staffIds.map((s) => plan.filter((a) => a.staffId === s).length),
      },
    };

    await prisma.$transaction(async (tx) => {
      for (const change of changes) {
        await tx.supportTicket.update({
          where: { id: change.ticketId },
          data: { assignedToId: change.staffId },
        });
      }
      await logAudit(tx, entry);
    });

    await notifyAudit(entry);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}

const replySchema = z.object({
  ticketId: z.string().min(1),
  body: z.string().trim().min(1, "empty_body").max(4000),
  /** An internal note is staff-only and needs its own permission. */
  internal: z.boolean().default(false),
});

/**
 * Post a reply, or an internal note.
 *
 * The internal variant requires `ticket.note.internal` on top of
 * `ticket.reply`, checked as a second explicit assertion — a note the customer
 * must never see is a different capability from a message to them, even though
 * both are "typing in the same box".
 */
export async function replyToTicket(input: unknown): Promise<ActionResult> {
  try {
    const parsed = replySchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message === "empty_body" ? "empty_body" : "not_found");
    }
    const { ticketId, body, internal } = parsed.data;

    const { adminId, role, ticket, next } = await prepare("REPLY", ticketId);
    if (internal) await assertPermission("ticket.note.internal");

    const ip = await currentIp();
    const entry = entryFor("REPLY", adminId, role, ticket, next, ip, {
      internal,
      length: body.length,
    });

    await prisma.$transaction(async (tx) => {
      await tx.supportTicket.update({ where: { id: ticket.id }, data: { status: next } });
      await tx.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          authorId: adminId,
          kind: internal ? "INTERNAL" : "AGENT",
          body,
        },
      });
      await logAudit(tx, entry);
    });

    // Deliberately NOT mirrored to Telegram: the group would receive the text
    // of staff replies to customers, which is support content, not an
    // operational event. The AuditLog row above records that a reply happened.
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}
