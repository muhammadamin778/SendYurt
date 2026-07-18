import { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Read-optimised Prisma client for the admin panel's heavy read paths
 * (paginated user lists, transaction/audit logs, dashboard aggregates).
 *
 * Neon best practice for read-heavy admin work:
 *  1. Point `DATABASE_READ_URL` at a Neon **read replica** endpoint. Replicas
 *     have their own compute, so large `count()`/`findMany()` scans and report
 *     exports don't contend with the primary that serves the consumer app's
 *     writes.
 *  2. Use the **pooled** (`-pooler`) host in that URL so many short serverless
 *     invocations share a small set of Postgres connections (PgBouncer) instead
 *     of each cold start opening a new one and exhausting the limit.
 *  3. Keep transactional writes on the primary `prisma` client — replicas are
 *     eventually consistent, so never read-then-write against a replica.
 *
 * When `DATABASE_READ_URL` is unset (local dev, single-instance), this simply
 * falls back to the primary client, so nothing breaks without the replica.
 */
const globalForRead = globalThis as unknown as { readPrisma?: PrismaClient };

function makeReadClient(): PrismaClient {
  const url = process.env.DATABASE_READ_URL;
  if (!url) return prisma; // fall back to the primary client
  return new PrismaClient({ datasources: { db: { url } } });
}

export const readPrisma: PrismaClient = globalForRead.readPrisma ?? makeReadClient();

if (process.env.NODE_ENV !== "production") globalForRead.readPrisma = readPrisma;
