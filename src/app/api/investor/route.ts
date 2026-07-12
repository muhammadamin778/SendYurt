import { NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, LIMITS, rateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(254),
  organization: z.string().trim().max(160).optional().or(z.literal("")),
  kind: z.enum(["INVESTOR", "PILOT"]).default("INVESTOR"),
  message: z.string().trim().min(10).max(2000),
});

/**
 * Public endpoint — pitch-page investor / pilot inquiries. Stores the
 * inquiry so it's never lost (unlike a mailto: link that silently does
 * nothing when no mail client is set up), and best-effort logs a notice.
 */
export async function POST(req: Request) {
  const limit = rateLimit(`investor:${clientIp(req.headers)}`, LIMITS.investor);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation" }, { status: 400 });
  }
  const data = parsed.data;

  try {
    await prisma.investorInquiry.create({
      data: {
        name: data.name,
        email: data.email,
        organization: data.organization || null,
        kind: data.kind,
        message: data.message,
      },
    });
    console.log(
      `[investor] ${data.kind} inquiry from ${data.name} <${data.email}>` +
        (data.organization ? ` (${data.organization})` : ""),
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("investor inquiry failed", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
