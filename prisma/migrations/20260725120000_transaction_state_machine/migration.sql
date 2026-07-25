-- Transaction state machine, immutable history and idempotency.
--
-- Adds:
--   • `Transaction.idempotencyKey` — makes creation replay-safe, so a retry or
--     double click cannot produce a second record (and a second card debit).
--   • `TransactionEvent` — the append-only transition log: one row per state
--     change including creation, carrying who / what / when / why.
--   • an index on (householdId, status), because admin queues filter by state.
--
-- No status backfill is required: the existing values PENDING / COMPLETED /
-- FAILED are retained verbatim and DISPUTED / REVERSED are simply new values
-- of the same free-string column.

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "idempotencyKey" TEXT;

-- CreateIndex
-- Postgres permits many NULLs under a unique index, so existing and seeded
-- rows (which have no key) are unaffected.
CREATE UNIQUE INDEX "Transaction_idempotencyKey_key" ON "Transaction"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Transaction_householdId_status_idx" ON "Transaction"("householdId", "status");

-- CreateTable
CREATE TABLE "TransactionEvent" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "actorId" TEXT,
    "reasonCode" TEXT NOT NULL,
    "note" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransactionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TransactionEvent_transactionId_createdAt_idx" ON "TransactionEvent"("transactionId", "createdAt");

-- CreateIndex
CREATE INDEX "TransactionEvent_actorId_createdAt_idx" ON "TransactionEvent"("actorId", "createdAt");

-- AddForeignKey
ALTER TABLE "TransactionEvent" ADD CONSTRAINT "TransactionEvent_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionEvent" ADD CONSTRAINT "TransactionEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: give every pre-existing transaction a creation event, so the
-- transition log is complete from the first row rather than starting empty.
INSERT INTO "TransactionEvent" ("id", "transactionId", "fromStatus", "toStatus", "event", "actorId", "reasonCode", "note", "createdAt")
SELECT
    'bf_' || "id",
    "id",
    NULL,
    "status",
    'CREATE',
    NULL,
    'CREATED',
    'Backfilled when the transition log was introduced.',
    "createdAt"
FROM "Transaction";
