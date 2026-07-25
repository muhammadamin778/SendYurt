import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";
import { clientIp, LIMITS, rateLimit } from "@/lib/rate-limit";
import { sendTelegramLog } from "@/lib/telegram";

/**
 * Client → Telegram relay for events that originate in the browser and so
 * can't be hooked server-side.
 *
 * Two classes of event:
 *  • Authenticated (`login`, `visit`) — identity comes from the Supabase
 *    session cookie, never the request body, so the email can't be spoofed.
 *    Per-user rate-limited.
 *  • Public failures (`login_failed`, `signup_failed`) — a failed login/signup
 *    has NO session, so these can't require a cookie. They carry the attempted
 *    email + failure code/reason in the body and are IP-rate-limited hard so a
 *    brute-force loop can't flood the logs group.
 *
 * The other event kinds — successful sign-ups, investor inquiries, admin
 * actions and Google logins — are fired directly from their server code paths
 * and never touch this route.
 */

const schema = z.object({
  type: z.enum(["login", "visit", "login_failed", "signup_failed"]),
  path: z.string().trim().max(512).optional(),
  email: z.string().trim().max(254).optional(),
  method: z.string().trim().max(60).optional(),
  code: z.string().trim().max(120).optional(),
  reason: z.string().trim().max(300).optional(),
});

const PUBLIC_TYPES = new Set(["login_failed", "signup_failed"]);

export async function POST(req: Request) {
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
  const { type, path, email, method, code, reason } = parsed.data;

  // ── Public failure events: no session, IP-rate-limited ──────────────────
  if (PUBLIC_TYPES.has(type)) {
    const ipLimit = rateLimit(`logEvent:pub:${clientIp(req.headers)}`, LIMITS.logEventPublic);
    if (!ipLimit.allowed) {
      return NextResponse.json({ ok: true, dropped: true });
    }

    const attempted = email || "(unknown email)";
    if (type === "login_failed") {
      void sendTelegramLog({
        category: "login",
        ok: false,
        title: attempted,
        fields: { Method: method || "Email + password", Code: code, Reason: reason },
      });
    } else {
      void sendTelegramLog({
        category: "signup",
        ok: false,
        title: attempted,
        fields: { Code: code, Reason: reason },
      });
    }
    return NextResponse.json({ ok: true });
  }

  // ── Authenticated success events: identity from the session cookie ──────
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const limit = rateLimit(`logEvent:${user.id}`, LIMITS.logEvent);
  if (!limit.allowed) {
    // Silently accept-and-drop: a throttled visit isn't worth a client error.
    return NextResponse.json({ ok: true, dropped: true });
  }

  if (type === "login") {
    void sendTelegramLog({
      category: "login",
      title: user.email,
      fields: { Method: "Email + password" },
    });
  } else {
    void sendTelegramLog({
      category: "visit",
      title: user.email,
      fields: { Path: path },
    });
  }

  return NextResponse.json({ ok: true });
}
