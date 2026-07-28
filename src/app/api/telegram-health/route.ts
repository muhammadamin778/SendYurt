import { NextResponse } from "next/server";
import { assertPermission } from "@/lib/admin";
import { clientIp, LIMITS, rateLimit } from "@/lib/rate-limit";

/**
 * Diagnostic endpoint for the Telegram logs bot.
 *
 * `GET /api/telegram-health`
 *   Reports whether THIS deployment can see the Telegram env vars and whether
 *   the token is valid — WITHOUT exposing the secret. Booleans, the public bot
 *   username, and a masked chat id only.
 *
 * `GET /api/telegram-health?probe=1`
 *   Additionally performs a REAL sendMessage and returns Telegram's raw
 *   response (`ok` / `error_code` / `description`). This is what distinguishes
 *   the failure modes that all look identical from outside:
 *     • "chat not found"        → TELEGRAM_LOG_CHAT_ID points at no chat
 *                                 (wrong value / typo / missing `-100` prefix)
 *     • "bot was kicked/not a member" → bot removed from the group
 *     • "not enough rights"     → bot can't post in that group
 *     • a fetch exception       → the deployment can't reach api.telegram.org
 *
 * The probe is IP-rate-limited and sends a fixed, innocuous message so it
 * can't be used to post arbitrary content. Remove this route once the bot is
 * confirmed healthy.
 */
export async function GET(req: Request) {
  // Staff-only. This endpoint was previously PUBLIC: it disclosed which
  // integration secrets are configured (plus a masked chat id) and `?probe=1`
  // would send a real Telegram message on behalf of the deployment — an
  // unauthenticated write to an external system.
  try {
    await assertPermission("settings.view");
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_LOG_CHAT_ID;

  const result: Record<string, unknown> = {
    tokenSet: Boolean(token),
    chatIdSet: Boolean(chatId),
    chatIdFormatOk: chatId ? /^-?\d+$/.test(chatId) : false,
    // Masked so the log destination isn't published in full, but still enough
    // to eyeball whether the deployed value is the one we expect.
    chatIdMasked: chatId ? `${chatId.slice(0, 4)}…${chatId.slice(-4)} (len ${chatId.length})` : null,
    visitsEnabled: process.env.TELEGRAM_LOG_VISITS !== "false",
  };

  if (token) {
    try {
      const r = await fetch(`https://api.telegram.org/bot${token}/getMe`, { cache: "no-store" });
      const j = (await r.json()) as { ok?: boolean; result?: { username?: string } };
      result.tokenValid = Boolean(j?.ok);
      result.botUsername = j?.result?.username ?? null;
    } catch (e) {
      result.tokenValid = false;
      result.getMeError = e instanceof Error ? e.message : String(e);
    }
  }

  const wantsProbe = new URL(req.url).searchParams.get("probe") === "1";
  if (wantsProbe && token && chatId) {
    const limit = rateLimit(`tgProbe:${clientIp(req.headers)}`, LIMITS.logEventPublic);
    if (!limit.allowed) {
      result.probe = { skipped: "rate_limited" };
    } else {
      try {
        const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: "🔧 Telegram health probe — verifying the logs bot can post here.",
            disable_notification: true,
          }),
          cache: "no-store",
        });
        const j = (await r.json()) as {
          ok?: boolean;
          error_code?: number;
          description?: string;
          result?: { message_id?: number };
        };
        result.probe = {
          httpStatus: r.status,
          ok: Boolean(j?.ok),
          errorCode: j?.error_code ?? null,
          description: j?.description ?? null,
          messageId: j?.result?.message_id ?? null,
        };
      } catch (e) {
        // A thrown fetch here means the deployment cannot reach Telegram at
        // all — exactly the case the swallowed catch in telegram.ts hides.
        result.probe = { threw: true, error: e instanceof Error ? e.message : String(e) };
      }
    }
  }

  return NextResponse.json(result);
}
