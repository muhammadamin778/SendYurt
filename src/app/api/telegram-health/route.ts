import { NextResponse } from "next/server";

/**
 * Diagnostic endpoint for the Telegram logs bot.
 *
 * Reports whether THIS deployment can see the Telegram env vars and whether
 * the token is actually valid — WITHOUT ever exposing the secret. Returns
 * only booleans plus the public bot username. Use it to tell apart the two
 * failure modes that look identical from the outside:
 *   • `tokenSet: false`  → the env var isn't reaching this deployment
 *                          (wrong scope / not redeployed / misnamed).
 *   • `tokenSet: true` but delivery still fails → the value is malformed
 *                          (`tokenValid: false`) or the chat id is wrong.
 *
 * Safe to leave in production; remove later if you prefer.
 */
export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_LOG_CHAT_ID;

  const result: Record<string, unknown> = {
    tokenSet: Boolean(token),
    chatIdSet: Boolean(chatId),
    chatIdFormatOk: chatId ? /^-?\d+$/.test(chatId) : false,
    visitsEnabled: process.env.TELEGRAM_LOG_VISITS !== "false",
  };

  if (token) {
    try {
      const r = await fetch(`https://api.telegram.org/bot${token}/getMe`, { cache: "no-store" });
      const j = (await r.json()) as { ok?: boolean; result?: { username?: string } };
      result.tokenValid = Boolean(j?.ok);
      result.botUsername = j?.result?.username ?? null;
    } catch {
      result.tokenValid = false;
    }
  }

  return NextResponse.json(result);
}
