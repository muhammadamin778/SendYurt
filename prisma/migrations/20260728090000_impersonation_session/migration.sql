-- Time-boxed, audited "view as user" sessions.
--
-- The browser cookie carries ONLY a row id from this table. Every request
-- re-validates it here and checks that the currently authenticated operator
-- matches `operatorId`, so the cookie is a pointer to a server-side grant
-- rather than a credential — no auth token is ever minted for the target.
--
-- Rows are never deleted. `endedAt` closes a session, so the record of who
-- viewed whose account, when and why, is permanent and queryable.
--
-- Purely additive: one new table. Rollback is a single DROP TABLE.

-- CreateTable
CREATE TABLE "ImpersonationSession" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "ip" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImpersonationSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImpersonationSession_operatorId_startedAt_idx" ON "ImpersonationSession"("operatorId", "startedAt");

-- CreateIndex
-- "who has looked at this customer's account?" is the question a dispute asks.
CREATE INDEX "ImpersonationSession_targetUserId_startedAt_idx" ON "ImpersonationSession"("targetUserId", "startedAt");

-- AddForeignKey
ALTER TABLE "ImpersonationSession" ADD CONSTRAINT "ImpersonationSession_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImpersonationSession" ADD CONSTRAINT "ImpersonationSession_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
