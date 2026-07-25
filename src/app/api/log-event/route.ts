import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { sendTelegramLog } from "@/lib/telegram";

/**
 * Client → Telegram relay for events that originate in the browser and so
 * can't be hooked server-side: a password login (Supabase signs in on the
 * client) and page visits. The two remaining event kinds — sign-ups, investor
 * inquiries, admin actions and Google logins — are fired directly from their
 * server code paths and never touch this route.
 *
 * Auth is by the Supabase session cookie (sent automatically with the fetch),
 * so we never handle a token in JS: an unauthenticated caller is rejected and
 * can't inject fake log lines. Rate-limited per user to keep the noisy visit
 * stream from ever flooding the group.
 */

const schema = z.object({
  type: z.enum(["login", "visit"]),
  path: z.string().trim().max(512).optional(),
});

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

  // Must be a signed-in user — identity comes from the session cookie, never
  // from the request body, so the email can't be spoofed.
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

  const { type, path } = parsed.data;
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
