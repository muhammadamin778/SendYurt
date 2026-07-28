/**
 * PII masking for staff surfaces.
 *
 * A support seat is a common breach vector, so agents see the least data that
 * still lets them do the job: enough of an identifier to match a customer who
 * is on the phone, not enough to harvest. Unmasking requires the
 * `customer.pii.view` permission (see src/lib/permissions.ts).
 *
 * Masking here is a display concern only — it never changes what is stored.
 */

/**
 * `jasur@example.uz` → `j•••@example.uz`
 *
 * The domain is kept: it carries no personal identity on its own and is often
 * what an agent needs to confirm ("is this the gmail one?"). A single-character
 * local part is fully masked rather than left exposed.
 */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at <= 0) return "•••"; // not an address shape — reveal nothing
  const local = email.slice(0, at);
  const domain = email.slice(at);
  if (local.length <= 1) return `•••${domain}`;
  return `${local[0]}•••${domain}`;
}

/**
 * `Jasur Alimov` → `Jasur A.`
 *
 * Enough to greet someone and match a record; not a full legal name.
 */
export function maskName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

/** Applies masking only when the viewer lacks permission to see the real value. */
export function emailFor(email: string, canSeePii: boolean): string {
  return canSeePii ? email : maskEmail(email);
}

export function nameFor(name: string, canSeePii: boolean): string {
  return canSeePii ? name : maskName(name);
}
