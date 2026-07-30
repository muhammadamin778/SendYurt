-- Richer audit entries.
--
-- Adds the fields an auditor actually needs beyond "something happened":
--   role   — the actor's staff tier AT THE TIME of the action. Captured, not
--            joined, so a later promotion/demotion cannot rewrite history.
--   before — snapshot prior to the change
--   after  — snapshot after it
--   ip     — request origin, best-effort from proxy headers
--
-- `before`/`after` become typed columns rather than being buried inside
-- `metadata`, so the viewer can render a diff without guessing at its shape.
-- `metadata` is kept for the remaining context (reason codes, filters, row
-- counts) and for rows written before this migration.
--
-- Fully additive and reversible: every column is nullable with no default, so
-- existing rows stay valid and a rollback is four DROP COLUMNs plus the index.

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN "role" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "before" JSONB;
ALTER TABLE "AuditLog" ADD COLUMN "after" JSONB;
ALTER TABLE "AuditLog" ADD COLUMN "ip" TEXT;

-- CreateIndex
-- The viewer's primary filter is action type over a date range.
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- Backfill what can be derived honestly from existing rows.
--
-- Older writers stored before/after inside metadata as { from, to } for role
-- changes and { suspended } for suspensions. Lift those into the typed columns
-- so the viewer renders history consistently. Anything not in that shape is
-- left NULL rather than invented — `role` in particular is NOT backfilled,
-- because the actor's tier at that moment is genuinely unknown.
UPDATE "AuditLog"
SET "before" = jsonb_build_object('adminRole', "metadata"->>'from'),
    "after"  = jsonb_build_object('adminRole', "metadata"->>'to')
WHERE "metadata" ? 'from'
  AND "metadata" ? 'to'
  AND "before" IS NULL;

UPDATE "AuditLog"
SET "before" = jsonb_build_object('suspended', NOT ("metadata"->>'suspended')::boolean),
    "after"  = jsonb_build_object('suspended', ("metadata"->>'suspended')::boolean)
WHERE "metadata" ? 'suspended'
  AND "before" IS NULL;
