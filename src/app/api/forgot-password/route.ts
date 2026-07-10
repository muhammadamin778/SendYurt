import { NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/mailer";
import { clientIp, LIMITS, rateLimit } from "@/lib/rate-limit";
import { forgotPasswordSchema } from "@/lib/validators";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

// Always answers 200 with the same body whether or not the email exists,
// so the endpoint can't be used to enumerate accounts.
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation" }, { status: 400 });
  }
  const email = parsed.data.email;

  const ipLimit = rateLimit(`forgot:ip:${clientIp(req.headers)}`, LIMITS.forgotPassword);
  const emailLimit = rateLimit(`forgot:email:${email}`, LIMITS.forgotPassword);
  if (!ipLimit.allowed || !emailLimit.allowed) {
    const retryAfter = Math.max(ipLimit.retryAfterSeconds, emailLimit.retryAfterSeconds);
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    let devResetUrl: string | undefined;
    if (user) {
      const rawToken = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256").update(rawToken).digest("hex");

      await prisma.$transaction([
        // One live token per user: a new request invalidates older links.
        prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
        prisma.passwordResetToken.create({
          data: {
            userId: user.id,
            tokenHash,
            expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
          },
        }),
      ]);

      const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
      const resetUrl = `${base}/${user.languagePref || "uz"}/reset-password?token=${rawToken}`;
      await sendPasswordResetEmail(user.email, resetUrl);
      if (process.env.NODE_ENV !== "production") {
        devResetUrl = resetUrl;
      }
    }

    // devResetUrl is only ever present in development builds.
    return NextResponse.json({ ok: true, ...(devResetUrl ? { devResetUrl } : {}) });
  } catch (e) {
    console.error("forgot-password failed", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
