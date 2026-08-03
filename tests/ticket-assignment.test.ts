import { describe, expect, it } from "vitest";
import {
  byLightestLoad,
  distributionShape,
  loadSpread,
  nextAssignee,
  planAssignments,
} from "@/lib/ticket-assignment";
import {
  allowedTicketEvents,
  canTicketTransition,
  nextTicketStatus,
} from "@/lib/ticket-state";

/**
 * How the queue gets split, and what may follow what.
 *
 * The distribution rule is easy to get subtly wrong — a naive chunker turns
 * 23-across-5 into 5,5,5,5,3 and quietly hands one person a whole extra
 * ticket. These assert the exact shape, including the worked example the
 * behaviour was specified with.
 */

describe("distributionShape", () => {
  it("splits 23 across 5 as 5,5,5,4,4 — the specified case", () => {
    expect(distributionShape(23, 5)).toEqual([5, 5, 5, 4, 4]);
  });

  it("gives everything to one person when they are the only one on shift", () => {
    expect(distributionShape(23, 1)).toEqual([23]);
  });

  it("splits evenly when it divides exactly", () => {
    expect(distributionShape(20, 5)).toEqual([4, 4, 4, 4, 4]);
  });

  it("never differs by more than one between the busiest and quietest", () => {
    // The property that matters, checked across a wide range rather than at a
    // few hand-picked points.
    for (let total = 0; total <= 60; total++) {
      for (let staff = 1; staff <= 8; staff++) {
        const shape = distributionShape(total, staff);
        expect(shape).toHaveLength(staff);
        // Nothing is dropped and nothing is invented.
        expect(shape.reduce((a, b) => a + b, 0)).toBe(total);
        expect(Math.max(...shape) - Math.min(...shape)).toBeLessThanOrEqual(1);
        // Larger shares come first, so the order is predictable.
        expect([...shape].sort((a, b) => b - a)).toEqual(shape);
      }
    }
  });

  it("handles fewer tickets than people — some get none, nobody gets two", () => {
    expect(distributionShape(3, 5)).toEqual([1, 1, 1, 0, 0]);
  });

  it("returns nothing when nobody is on shift", () => {
    // Better an empty plan than a divide-by-zero or a phantom assignee.
    expect(distributionShape(10, 0)).toEqual([]);
    expect(planAssignments(["t1", "t2"], [])).toEqual([]);
  });
});

describe("planAssignments", () => {
  it("assigns every ticket exactly once, in the shape above", () => {
    const tickets = Array.from({ length: 23 }, (_, i) => `t${i + 1}`);
    const staff = ["s1", "s2", "s3", "s4", "s5"];
    const plan = planAssignments(tickets, staff);

    expect(plan).toHaveLength(23);
    expect(new Set(plan.map((a) => a.ticketId)).size).toBe(23);

    const perStaff = staff.map((s) => plan.filter((a) => a.staffId === s).length);
    expect(perStaff).toEqual([5, 5, 5, 4, 4]);
  });

  it("is deterministic — the plan previewed is the plan applied", () => {
    const tickets = ["t1", "t2", "t3", "t4", "t5", "t6", "t7"];
    const staff = ["s1", "s2", "s3"];
    expect(planAssignments(tickets, staff)).toEqual(planAssignments(tickets, staff));
  });

  it("keeps each person's tickets contiguous from the ordered queue", () => {
    const plan = planAssignments(["a", "b", "c", "d", "e"], ["s1", "s2"]);
    expect(plan.filter((p) => p.staffId === "s1").map((p) => p.ticketId)).toEqual(["a", "b", "c"]);
    expect(plan.filter((p) => p.staffId === "s2").map((p) => p.ticketId)).toEqual(["d", "e"]);
  });
});

describe("load balancing", () => {
  it("orders the lightest desk first, breaking ties predictably", () => {
    const loads = [
      { staffId: "s3", open: 7 },
      { staffId: "s1", open: 2 },
      { staffId: "s2", open: 2 },
    ];
    expect(byLightestLoad(loads)).toEqual(["s1", "s2", "s3"]);
  });

  it("sends a new ticket to the quietest desk", () => {
    expect(nextAssignee([{ staffId: "a", open: 9 }, { staffId: "b", open: 1 }])).toBe("b");
  });

  it("leaves a ticket unassigned rather than inventing an owner", () => {
    expect(nextAssignee([])).toBeNull();
  });

  it("reports how lopsided the queue is", () => {
    expect(loadSpread([{ staffId: "a", open: 5 }, { staffId: "b", open: 5 }])).toBe(0);
    expect(loadSpread([{ staffId: "a", open: 9 }, { staffId: "b", open: 2 }])).toBe(7);
    expect(loadSpread([])).toBe(0);
  });
});

describe("ticket lifecycle", () => {
  it("moves an open ticket into progress when work starts on it", () => {
    expect(nextTicketStatus("OPEN", "ASSIGN")).toBe("IN_PROGRESS");
    expect(nextTicketStatus("OPEN", "REPLY")).toBe("IN_PROGRESS");
    expect(nextTicketStatus("IN_PROGRESS", "RESOLVE")).toBe("RESOLVED");
  });

  it("refuses to grow a resolved thread until it is reopened", () => {
    // Otherwise "resolved at 14:02" stops meaning anything.
    expect(canTicketTransition("RESOLVED", "REPLY")).toBe(false);
    expect(canTicketTransition("RESOLVED", "ASSIGN")).toBe(false);
    expect(canTicketTransition("RESOLVED", "REQUEST_KYC")).toBe(false);
    expect(allowedTicketEvents("RESOLVED")).toEqual(["REOPEN"]);
  });

  it("lets reassignment and further replies happen without changing state", () => {
    expect(nextTicketStatus("IN_PROGRESS", "ASSIGN")).toBe("IN_PROGRESS");
    expect(nextTicketStatus("IN_PROGRESS", "REPLY")).toBe("IN_PROGRESS");
  });

  it("cannot reopen something that was never closed", () => {
    expect(canTicketTransition("OPEN", "REOPEN")).toBe(false);
    expect(canTicketTransition("IN_PROGRESS", "REOPEN")).toBe(false);
  });
});
