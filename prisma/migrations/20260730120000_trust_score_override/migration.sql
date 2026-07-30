-- Operator adjustments layered on top of the computed Trust Score.
--
-- Nothing here mutates `TrustScoreSnapshot` or the computation. The base score
-- is still recomputed from the ledger; `delta` is applied on read, so both
-- numbers stay visible and "your score is 68: 61 computed, +7 for the dispute
-- we resolved in your favour" is answerable from the data.
--
-- Rows are never deleted — an override is retired via `revokedAt`.
--
-- Purely additive: one new table. Rollback is a single DROP TABLE.

-- CreateTable
CREATE TABLE "TrustScoreOverride" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "reasonCode" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "revokedById" TEXT,

    CONSTRAINT "TrustScoreOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
-- "what adjustments does this household have, newest first" is the only read.
CREATE INDEX "TrustScoreOverride_householdId_createdAt_idx" ON "TrustScoreOverride"("householdId", "createdAt");

-- AddForeignKey
ALTER TABLE "TrustScoreOverride" ADD CONSTRAINT "TrustScoreOverride_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
-- RESTRICT, not CASCADE: deleting a staff account must not erase the record of
-- what they adjusted.
ALTER TABLE "TrustScoreOverride" ADD CONSTRAINT "TrustScoreOverride_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustScoreOverride" ADD CONSTRAINT "TrustScoreOverride_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
