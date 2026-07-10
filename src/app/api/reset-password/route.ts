import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { clientIp, LIMITS, rateLimit } from "@/lib/rate-limit";
import { resetPasswordSchema } from "@/lib/validators";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation" }, { status: 400 });
  }

  const limit = rateLimit(`reset:ip:${clientIp(req.headers)}`, LIMITS.resetPassword);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const tokenHash = createHash("sha256").update(parsed.data.token).digest("hex");

  try {
    const token = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });
    if (!token || token.usedAt || token.expiresAt < new Date()) {
      return NextResponse.json({ error: "invalid_token" }, { status: 400 });
    }

    const passwordHash = await hash(parsed.data.password, 12);

    // Mark the token used with a guard against concurrent double-spend:
    // only the request that flips usedAt from null wins.
    const claimed = await prisma.passwordResetToken.updateMany({
      where: { id: token.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (claimed.count === 0) {
      return NextResponse.json({ error: "invalid_token" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: token.userId },
      data: { passwordHash },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("reset-password failed", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
