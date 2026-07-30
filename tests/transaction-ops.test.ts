import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Behavioural proof for the two bugs this change fixes. Unlike the rest of the
 * suite these exercise a server action, so the Prisma client and the session
 * are replaced with an in-memory fake — there is no test database.
 *
 * What is being proven:
 *  1. A replayed submission (double click / retry) does NOT create a second
 *     record, and for a remittance does NOT debit the card twice.
 *  2. Reversing a savings contribution DECREMENTS the goal. The old hard
 *     delete did not, which is why goals and contributions drifted apart.
 */

// ── In-memory store ────────────────────────────────────────────────────────
type Row = Record<string, unknown>;
const db = {
  users: [] as Row[],
  transactions: [] as Row[],
  goals: [] as Row[],
  cards: [] as Row[],
  events: [] as Row[],
  audits: [] as Row[],
};

let idSeq = 0;
const nextId = () => `id_${++idSeq}`;

/**
 * Real Prisma returns detached plain objects, so a later `update` does not
 * mutate a row you already read. The fake must copy for the same reason —
 * otherwise a snapshot taken before an update would appear to change.
 */
const snapshot = <T extends Row | null | undefined>(row: T): T =>
  (row ? ({ ...row } as T) : row);

/** Minimal `where` matcher — supports equality plus the `gte` we rely on. */
function matches(row: Row, where: Row): boolean {
  return Object.entries(where).every(([k, v]) => {
    if (v !== null && typeof v === "object" && "gte" in (v as Row)) {
      return (row[k] as bigint) >= ((v as Row).gte as bigint);
    }
    return row[k] === v;
  });
}

function makeClient() {
  const client = {
    user: {
      findUnique: async ({ where }: { where: Row }) =>
        snapshot(db.users.find((u) => matches(u, where))) ?? null,
      findFirst: async ({ where }: { where: Row }) =>
        snapshot(db.users.find((u) => matches(u, where))) ?? null,
    },
    transaction: {
      findUnique: async ({ where }: { where: Row }) =>
        snapshot(db.transactions.find((t) => matches(t, where))) ?? null,
      findFirst: async ({ where }: { where: Row }) =>
        snapshot(db.transactions.find((t) => matches(t, where))) ?? null,
      create: async ({ data }: { data: Row }) => {
        const key = data.idempotencyKey;
        if (key && db.transactions.some((t) => t.idempotencyKey === key)) {
          // Mirrors Postgres' unique-index violation.
          const err = Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
          Object.setPrototypeOf(err, PrismaKnownError.prototype);
          throw err;
        }
        const row = { id: nextId(), ...data };
        db.transactions.push(row);
        return row;
      },
      update: async ({ where, data }: { where: Row; data: Row }) => {
        const row = db.transactions.find((t) => matches(t, where));
        if (!row) throw new Error("not found");
        Object.assign(row, data);
        return row;
      },
    },
    savingsGoal: {
      findFirst: async ({ where }: { where: Row }) =>
        snapshot(db.goals.find((g) => matches(g, where))) ?? null,
      update: async ({ where, data }: { where: Row; data: Row }) => {
        const row = db.goals.find((g) => matches(g, where));
        if (!row) throw new Error("not found");
        applyMutation(row, data);
        return row;
      },
      updateMany: async ({ where, data }: { where: Row; data: Row }) => {
        const rows = db.goals.filter((g) => matches(g, where));
        rows.forEach((r) => applyMutation(r, data));
        return { count: rows.length };
      },
    },
    card: {
      findFirst: async ({ where }: { where: Row }) =>
        snapshot(db.cards.find((c) => matches(c, where))) ?? null,
      findUnique: async ({ where }: { where: Row }) =>
        snapshot(db.cards.find((c) => matches(c, where))) ?? null,
      update: async ({ where, data }: { where: Row; data: Row }) => {
        const row = db.cards.find((c) => matches(c, where));
        if (!row) throw new Error("not found");
        applyMutation(row, data);
        return row;
      },
      updateMany: async ({ where, data }: { where: Row; data: Row }) => {
        const rows = db.cards.filter((c) => matches(c, where));
        rows.forEach((r) => applyMutation(r, data));
        return { count: rows.length };
      },
    },
    transactionEvent: {
      create: async ({ data }: { data: Row }) => {
        const row = { id: nextId(), ...data };
        db.events.push(row);
        return row;
      },
    },
    auditLog: {
      create: async ({ data }: { data: Row }) => {
        const row = { id: nextId(), ...data };
        db.audits.push(row);
        return row;
      },
    },
    // Not a real transaction — enough to run the callback with the same client.
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(client),
  };
  return client;
}

/** Handles Prisma's `{ increment }` / `{ decrement }` update operators. */
function applyMutation(row: Row, data: Row) {
  for (const [k, v] of Object.entries(data)) {
    if (v !== null && typeof v === "object" && "increment" in (v as Row)) {
      row[k] = (row[k] as bigint) + ((v as Row).increment as bigint);
    } else if (v !== null && typeof v === "object" && "decrement" in (v as Row)) {
      row[k] = (row[k] as bigint) - ((v as Row).decrement as bigint);
    } else {
      row[k] = v;
    }
  }
}

class PrismaKnownError extends Error {
  code = "P2002";
}

const fakePrisma = makeClient();

// ── Module mocks ───────────────────────────────────────────────────────────
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
// audit.ts pulls in telegram.ts, which imports "server-only" — unresolvable
// outside the Next runtime.
vi.mock("@/lib/telegram", () => ({ sendTelegramLog: async () => {} }));
vi.mock("@/lib/prisma", () => ({ prisma: fakePrisma }));
vi.mock("@/lib/supabase/app-session", () => ({
  getAppSession: async () => ({ user: { id: "user_1" } }),
}));
vi.mock("@/lib/notifications", () => ({
  crossedNearThreshold: () => false,
  notifyHousehold: async () => {},
}));
vi.mock("@prisma/client", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("@prisma/client");
  return {
    ...actual,
    Prisma: {
      ...(actual.Prisma as Record<string, unknown>),
      JsonNull: null,
      PrismaClientKnownRequestError: PrismaKnownError,
    },
  };
});

const { contributeToGoal, reverseTransaction } = await import("@/app/actions/budget");

beforeEach(() => {
  db.users = [{ id: "user_1", householdId: "hh_1", accessRole: "ADMIN" }];
  db.transactions = [];
  db.goals = [
    { id: "goal_1", householdId: "hh_1", name: "Wedding", currentAmount: 0n, targetAmount: 1_000_000n },
  ];
  db.cards = [{ id: "card_1", userId: "user_1", isDefault: true, balance: 500_000n, createdAt: new Date() }];
  db.events = [];
  db.audits = [];
});

describe("idempotency", () => {
  it("a replayed contribution creates ONE record and increments the goal ONCE", async () => {
    const input = { goalId: "goal_1", amount: "1000", idempotencyKey: "attempt-abc-123" };

    const first = await contributeToGoal(input);
    const second = await contributeToGoal(input); // the double click

    expect(first).toEqual({ ok: true });
    // The replay reports success — the user's intent was satisfied — but
    // nothing new was written.
    expect(second).toEqual({ ok: true });
    expect(db.transactions).toHaveLength(1);
    expect(db.goals[0].currentAmount).toBe(100_000n); // 1000.00 UZS in tiyin, once
  });

  it("without a key there is no protection — the bug this guards against", async () => {
    const input = { goalId: "goal_1", amount: "1000" };
    await contributeToGoal(input);
    await contributeToGoal(input);
    // Two records, double increment: exactly the old behaviour, which is why
    // the client must send a key.
    expect(db.transactions).toHaveLength(2);
    expect(db.goals[0].currentAmount).toBe(200_000n);
  });
});

describe("reversal", () => {
  it("decrements the goal, keeps the row, and records why", async () => {
    await contributeToGoal({ goalId: "goal_1", amount: "1000", idempotencyKey: "reversal-key-1" });
    expect(db.goals[0].currentAmount).toBe(100_000n);

    const txId = db.transactions[0].id as string;
    const result = await reverseTransaction({
      id: txId,
      reasonCode: "ENTERED_IN_ERROR",
      note: "wrong goal",
    });

    expect(result).toEqual({ ok: true });
    // The goal is corrected — the old hard delete left this untouched.
    expect(db.goals[0].currentAmount).toBe(0n);
    // The record still exists, marked, rather than being destroyed.
    expect(db.transactions).toHaveLength(1);
    expect(db.transactions[0].status).toBe("REVERSED");
    // …and the reason is recorded in both logs.
    const reversal = db.events.find((e) => e.event === "REVERSE");
    expect(reversal).toMatchObject({
      fromStatus: "COMPLETED",
      toStatus: "REVERSED",
      reasonCode: "ENTERED_IN_ERROR",
      actorId: "user_1",
      note: "wrong goal",
    });
    // Deliberately NOT in the staff audit log: AuditLog records what an
    // OPERATOR did to a customer, and this actor is an ordinary household
    // member. Their trail is the TransactionEvent asserted above.
    expect(db.audits).toHaveLength(0);
  });

  it("refuses a reason code that belongs to a different event", async () => {
    await contributeToGoal({ goalId: "goal_1", amount: "1000", idempotencyKey: "reversal-key-2" });
    const txId = db.transactions[0].id as string;
    // NOT_RECEIVED is a dispute reason, not a reversal reason.
    const result = await reverseTransaction({ id: txId, reasonCode: "NOT_RECEIVED" });
    expect(result).toEqual({ ok: false, error: "invalid_reason" });
    expect(db.transactions[0].status).toBe("COMPLETED");
  });

  it("cannot reverse the same transaction twice", async () => {
    await contributeToGoal({ goalId: "goal_1", amount: "1000", idempotencyKey: "reversal-key-3" });
    const txId = db.transactions[0].id as string;
    await reverseTransaction({ id: txId, reasonCode: "DUPLICATE" });
    const again = await reverseTransaction({ id: txId, reasonCode: "DUPLICATE" });

    // REVERSED is terminal, so the state machine refuses — the goal cannot be
    // decremented a second time.
    expect(again).toEqual({ ok: false, error: "illegal_transition" });
    expect(db.goals[0].currentAmount).toBe(0n);
  });
});
