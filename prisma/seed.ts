/**
 * Seed script: remittance providers (sample fee structures) and a demo
 * household with 9 months of realistic transaction history so the app can
 * be shown live without registering on stage.
 *
 * Demo logins (also printed at the end of the run):
 *   sender:   demo.sender@sendyurt.uz   / Demo1234
 *   receiver: demo.receiver@sendyurt.uz / Demo1234
 *
 * All seeded rates and history are SAMPLE DATA and are labeled as such in
 * the UI.
 */
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

// Realistic provider archetypes for the Russia/abroad → Uzbekistan corridor.
// Fee shapes are representative, not live rates.
const PROVIDERS = [
  {
    slug: "koronapay",
    name: "KoronaPay",
    baseFee: 0,
    percentFee: 0,
    exchangeRateMargin: 1.2,
    transferSpeedHours: 1,
    sourceCurrencies: "USD,RUB,KZT,EUR",
  },
  {
    slug: "paysend",
    name: "Paysend",
    baseFee: 1.5,
    percentFee: 0,
    exchangeRateMargin: 0.8,
    transferSpeedHours: 3,
    sourceCurrencies: "USD,RUB,EUR",
  },
  {
    slug: "unistream",
    name: "Unistream",
    baseFee: 0,
    percentFee: 1.0,
    exchangeRateMargin: 1.5,
    transferSpeedHours: 1,
    sourceCurrencies: "USD,RUB,KZT",
  },
  {
    slug: "western-union",
    name: "Western Union",
    baseFee: 4.0,
    percentFee: 0.5,
    exchangeRateMargin: 2.5,
    transferSpeedHours: 1,
    sourceCurrencies: "USD,RUB,KZT,EUR",
  },
  {
    slug: "moneygram",
    name: "MoneyGram",
    baseFee: 3.5,
    percentFee: 0.4,
    exchangeRateMargin: 2.2,
    transferSpeedHours: 6,
    sourceCurrencies: "USD,EUR,KZT",
  },
  {
    slug: "ria",
    name: "Ria Money Transfer",
    baseFee: 2.0,
    percentFee: 0.3,
    exchangeRateMargin: 1.8,
    transferSpeedHours: 24,
    sourceCurrencies: "USD,RUB,EUR",
  },
] as const;

async function seedProviders() {
  for (const p of PROVIDERS) {
    await prisma.remittanceProvider.upsert({
      where: { slug: p.slug },
      update: { ...p },
      create: { ...p },
    });
  }
  console.log(`Seeded ${PROVIDERS.length} providers.`);
}

async function main() {
  await seedProviders();
  await seedDemoHousehold();
}

// ---------------------------------------------------------------------------
// Demo household
// ---------------------------------------------------------------------------

const DEMO_SENDER_EMAIL = "demo.sender@sendyurt.uz";
const DEMO_RECEIVER_EMAIL = "demo.receiver@sendyurt.uz";
const DEMO_PASSWORD = "Demo1234";

/** Deterministic pseudo-random generator so reseeding is reproducible. */
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

function ym(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

async function seedDemoHousehold() {
  const existing = await prisma.user.findUnique({ where: { email: DEMO_SENDER_EMAIL } });
  if (existing) {
    // Wipe and re-create so reseeding always produces a clean, current demo.
    const householdId = existing.householdId;
    await prisma.transaction.deleteMany({ where: { householdId } });
    await prisma.budget.deleteMany({ where: { householdId } });
    await prisma.savingsGoal.deleteMany({ where: { householdId } });
    await prisma.trustScoreSnapshot.deleteMany({ where: { householdId } });
    await prisma.user.deleteMany({ where: { householdId } });
    await prisma.household.delete({ where: { id: householdId } });
  }

  const passwordHash = await hash(DEMO_PASSWORD, 12);

  const household = await prisma.household.create({
    data: {
      name: "Karimov Family (Demo)",
      inviteCode: "DEMOYURT",
      users: {
        create: [
          {
            name: "Aziz Karimov",
            email: DEMO_SENDER_EMAIL,
            passwordHash,
            role: "SENDER",
            languagePref: "uz",
          },
          {
            name: "Nilufar Karimova",
            email: DEMO_RECEIVER_EMAIL,
            passwordHash,
            role: "RECEIVER",
            languagePref: "uz",
          },
        ],
      },
    },
    include: { users: true },
  });

  const sender = household.users.find((u) => u.role === "SENDER")!;
  const receiver = household.users.find((u) => u.role === "RECEIVER")!;
  const korona = await prisma.remittanceProvider.findUnique({ where: { slug: "koronapay" } });
  const paysend = await prisma.remittanceProvider.findUnique({ where: { slug: "paysend" } });

  const rand = mulberry32(42);
  const txs: import("@prisma/client").Prisma.TransactionCreateManyInput[] = [];

  // 9 months of history. Aziz sends ~400 USD around the 5th of each month,
  // with a believable wobble, one skipped month (7 months ago) and a summer
  // bonus month. Received in UZS at ~12,900 per USD.
  const USD_UZS = 12_900;
  const todayUtcDate = new Date().getUTCDate();
  for (let m = 9; m >= 0; m--) {
    if (m === 7) continue; // missed month — makes the consistency story honest
    const base = m === 3 ? 550 : 400; // bonus month
    const usd = Math.round(base + (rand() - 0.5) * 60);
    const day = 4 + Math.floor(rand() * 4);
    if (m === 0 && day > todayUtcDate) continue; // hasn't happened yet this month
    const date = monthsAgo(m, day);
    txs.push({
      householdId: household.id,
      type: "REMITTANCE",
      senderId: sender.id,
      receiverId: receiver.id,
      providerId: (m % 2 === 0 ? korona : paysend)?.id ?? null,
      amount: Math.round(usd * USD_UZS * (1 - 0.012)),
      currency: "UZS",
      sourceAmount: usd,
      sourceCurrency: "USD",
      note: "Monthly support",
      date,
      status: "COMPLETED",
      isDemo: true,
    });
  }

  // Receiver-side income: Nilufar's part-time salary.
  for (let m = 9; m >= 0; m--) {
    const date = monthsAgo(m, 1);
    txs.push({
      householdId: household.id,
      type: "INCOME",
      amount: 2_400_000 + Math.round((rand() - 0.5) * 200_000),
      currency: "UZS",
      note: "Salary",
      date,
      status: "COMPLETED",
      isDemo: true,
    });
  }

  // Monthly expenses by category with a realistic shape (UZS).
  const EXPENSES: Array<[category: string, mean: number, spread: number, day: number]> = [
    ["food", 2_100_000, 300_000, 8],
    ["food", 1_600_000, 250_000, 20],
    ["utilities", 550_000, 120_000, 10],
    ["education", 900_000, 100_000, 12],
    ["health", 350_000, 200_000, 16],
    ["transport", 420_000, 90_000, 6],
    ["household", 500_000, 180_000, 24],
  ];
  for (let m = 9; m >= 0; m--) {
    for (const [category, mean, spread, day] of EXPENSES) {
      // Skip an occasional line to keep the data from looking synthetic.
      if (rand() < 0.08) continue;
      if (m === 0 && day > todayUtcDate) continue;
      const date = monthsAgo(m, day);
      txs.push({
        householdId: household.id,
        type: "EXPENSE",
        amount: Math.max(50_000, Math.round(mean + (rand() - 0.5) * 2 * spread)),
        currency: "UZS",
        category,
        date,
        status: "COMPLETED",
        isDemo: true,
      });
    }
  }

  // Savings deposits: steady 500k UZS/month, growing after the bonus.
  let savingsTotal = 0;
  for (let m = 9; m >= 0; m--) {
    if (m === 7) continue;
    if (m === 0 && 15 > todayUtcDate) continue;
    const amount = m <= 3 ? 700_000 : 500_000;
    savingsTotal += amount;
    txs.push({
      householdId: household.id,
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

  // Savings goals.
  await prisma.savingsGoal.createMany({
    data: [
      {
        householdId: household.id,
        name: "Toʻy fund (wedding)",
        targetAmount: 15_000_000,
        currentAmount: savingsTotal * 0.6,
        targetDate: monthsAgo(-8, 1), // ~8 months from now
      },
      {
        householdId: household.id,
        name: "New refrigerator",
        targetAmount: 4_500_000,
        currentAmount: savingsTotal * 0.4,
        targetDate: monthsAgo(-3, 1),
      },
    ],
  });

  // Budgets for the current month.
  const now = new Date();
  const period = ym(now);
  await prisma.budget.createMany({
    data: [
      { householdId: household.id, category: "food", amountAllocated: 4_000_000, period },
      { householdId: household.id, category: "utilities", amountAllocated: 700_000, period },
      { householdId: household.id, category: "education", amountAllocated: 1_000_000, period },
      { householdId: household.id, category: "health", amountAllocated: 600_000, period },
      { householdId: household.id, category: "transport", amountAllocated: 500_000, period },
      { householdId: household.id, category: "household", amountAllocated: 800_000, period },
    ],
  });

  console.log("Seeded demo household:", household.name);
  console.log(`  sender:   ${DEMO_SENDER_EMAIL} / ${DEMO_PASSWORD}`);
  console.log(`  receiver: ${DEMO_RECEIVER_EMAIL} / ${DEMO_PASSWORD}`);
  console.log(`  invite code: DEMOYURT`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
