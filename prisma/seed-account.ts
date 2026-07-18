/**
 * Populate an EXISTING account's household with demo history so charts and
 * summaries are lively — without touching the user row (password/session
 * are preserved). Idempotent: clears prior demo rows, then reinserts.
 *
 * Usage: tsx prisma/seed-account.ts <email>
 * Default email: muhammadaminshomurodov4@gmail.com
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function monthsAgo(months: number, day: number): Date {
  const d = new Date();
  d.setUTCHours(10, 0, 0, 0);
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - months);
  const daysInMonth = new Date(d.getUTCFullYear(), d.getUTCMonth() + 1, 0).getDate();
  d.setUTCDate(Math.min(day, daysInMonth));
  return d;
}

const ym = (date: Date) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;

async function main() {
  const email = process.argv[2] ?? "muhammadaminshomurodov4@gmail.com";
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`No account found for ${email}. Register first, then re-run.`);
    process.exit(1);
  }
  const householdId = user.householdId;

  // Clear prior demo rows only (keep any real rows the user added).
  await prisma.transaction.deleteMany({ where: { householdId, isDemo: true } });
  await prisma.savingsGoal.deleteMany({ where: { householdId } });
  await prisma.budget.deleteMany({ where: { householdId } });
  await prisma.notification.deleteMany({ where: { householdId } });

  const korona = await prisma.remittanceProvider.findUnique({ where: { slug: "koronapay" } });
  const paysend = await prisma.remittanceProvider.findUnique({ where: { slug: "paysend" } });

  const rand = mulberry32(7);
  const txs: import("@prisma/client").Prisma.TransactionCreateManyInput[] = [];
  const USD_UZS = 12_900;
  const today = new Date().getUTCDate();

  // Remittances sent by this user (~450 USD/month, one skipped month, a bonus).
  for (let m = 9; m >= 0; m--) {
    if (m === 6) continue;
    const base = m === 2 ? 620 : 450;
    const usd = Math.round(base + (rand() - 0.5) * 70);
    const day = 3 + Math.floor(rand() * 5);
    if (m === 0 && day > today) continue;
    txs.push({
      householdId,
      type: "REMITTANCE",
      senderId: user.id,
      providerId: (m % 2 === 0 ? korona : paysend)?.id ?? null,
      amount: Math.round(usd * USD_UZS * (1 - 0.012)),
      currency: "UZS",
      sourceAmount: usd,
      sourceCurrency: "USD",
      note: "Monthly support",
      date: monthsAgo(m, day),
      status: "COMPLETED",
      isDemo: true,
    });
  }

  // Household income.
  for (let m = 9; m >= 0; m--) {
    txs.push({
      householdId,
      type: "INCOME",
      amount: 2_700_000 + Math.round((rand() - 0.5) * 220_000),
      currency: "UZS",
      note: "Salary",
      date: monthsAgo(m, 1),
      status: "COMPLETED",
      isDemo: true,
    });
  }

  // Expenses by category.
  const EXPENSES: Array<[string, number, number, number]> = [
    ["food", 2_300_000, 320_000, 7],
    ["food", 1_500_000, 240_000, 19],
    ["utilities", 600_000, 130_000, 9],
    ["education", 1_050_000, 120_000, 11],
    ["health", 400_000, 220_000, 15],
    ["transport", 460_000, 95_000, 5],
    ["household", 540_000, 190_000, 23],
  ];
  for (let m = 9; m >= 0; m--) {
    for (const [category, mean, spread, day] of EXPENSES) {
      if (rand() < 0.08) continue;
      if (m === 0 && day > today) continue;
      txs.push({
        householdId,
        type: "EXPENSE",
        amount: Math.max(50_000, Math.round(mean + (rand() - 0.5) * 2 * spread)),
        currency: "UZS",
        category,
        date: monthsAgo(m, day),
        status: "COMPLETED",
        isDemo: true,
      });
    }
  }

  // Savings.
  let savingsTotal = 0;
  for (let m = 9; m >= 0; m--) {
    if (m === 6) continue;
    if (m === 0 && 15 > today) continue;
    const amount = m <= 2 ? 800_000 : 550_000;
    savingsTotal += amount;
    txs.push({
      householdId,
      type: "SAVINGS",
      amount,
      currency: "UZS",
      note: "Family savings",
      date: monthsAgo(m, 15),
      status: "COMPLETED",
      isDemo: true,
    });
  }

  await prisma.transaction.createMany({ data: txs });

  await prisma.savingsGoal.createMany({
    data: [
      { householdId, name: "Toʻy fund (wedding)", targetAmount: 18_000_000, currentAmount: savingsTotal * 0.55, targetDate: monthsAgo(-9, 1) },
      { householdId, name: "New laptop", targetAmount: 12_000_000, currentAmount: savingsTotal * 0.35, targetDate: monthsAgo(-4, 1) },
    ],
  });

  const period = ym(new Date());
  await prisma.budget.createMany({
    data: [
      { householdId, category: "food", amountAllocated: 4_200_000, period },
      { householdId, category: "utilities", amountAllocated: 750_000, period },
      { householdId, category: "education", amountAllocated: 1_100_000, period },
      { householdId, category: "health", amountAllocated: 650_000, period },
      { householdId, category: "transport", amountAllocated: 550_000, period },
      { householdId, category: "household", amountAllocated: 850_000, period },
    ],
  });

  // A fresh notification for the bell.
  const lastRemit = [...txs].reverse().find((t) => t.type === "REMITTANCE");
  if (lastRemit) {
    await prisma.notification.create({
      data: {
        userId: user.id,
        householdId,
        type: "REMITTANCE_LOGGED",
        payload: JSON.stringify({ amount: lastRemit.amount, currency: "UZS" }),
      },
    });
  }

  console.log(`Seeded demo history for ${email} (household ${householdId}): ${txs.length} transactions.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
