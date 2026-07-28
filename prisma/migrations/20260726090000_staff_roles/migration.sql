-- Staff role tiers.
--
-- Splits the single ADMIN boolean into a set of tiers whose permissions are
-- defined in src/lib/permissions.ts:
--
--   SUPPORT     — customer help: masked PII, read transactions, work tickets
--   ADMIN       — operations: reversals, exports, suspensions, unmasked PII
--   SUPER_ADMIN — additionally system settings and staff role management
--
-- NOTE: `ALTER TYPE ... ADD VALUE` cannot run inside a transaction block in
-- PostgreSQL, so these statements must stay in their own migration with no
-- other DDL beside them. Prisma runs each migration file in a transaction by
-- default; this file is safe because ADD VALUE is the only statement type here
-- and Postgres permits it when it is not mixed with other work in the same
-- transaction. If a future Postgres/Prisma combination rejects it, split each
-- ADD VALUE into its own migration.

ALTER TYPE "AdminRole" ADD VALUE IF NOT EXISTS 'SUPPORT';
ALTER TYPE "AdminRole" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';

-- Existing platform admins keep working unchanged: ADMIN remains a valid
-- value and retains operations permissions. Promoting the first SUPER_ADMIN is
-- a deliberate manual step, e.g.
--
--   UPDATE "User" SET "adminRole" = 'SUPER_ADMIN' WHERE email = 'you@example.com';
--
-- It is left out of the migration on purpose — silently minting a super admin
-- from a migration would be exactly the kind of unaudited privilege grant this
-- work exists to prevent.
