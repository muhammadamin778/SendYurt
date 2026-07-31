-- Backfills the migration that `09c5b1a` (real Stripe payments) never wrote.
--
-- `Card.stripeCustomerId` and `Card.stripePaymentMethodId` have been in
-- schema.prisma — and read by src/app/actions/cards.ts, remittance.ts and the
-- Stripe API routes — with nothing in prisma/migrations creating them. A
-- database built from the migration history was therefore missing two columns
-- the code depends on, and Add Card / card-funded sends would fail on it.
--
-- IF NOT EXISTS is deliberate. Environments where the schema was pushed with
-- `prisma db push` or `migrate dev` already have these columns; this must be
-- safe to apply there too, not just on a database built purely from history.
--
-- Purely additive, both nullable, no backfill: an existing card simply has no
-- Stripe linkage, which is exactly what the code already handles
-- (`if (found.stripePaymentMethodId)` falls back to the stored-value balance).

-- AlterTable
ALTER TABLE "Card" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;
ALTER TABLE "Card" ADD COLUMN IF NOT EXISTS "stripePaymentMethodId" TEXT;
