import "server-only";

/**
 * Telegram "logs bot".
 *
 * Forwards operational events (sign-ups, logins, investor inquiries, admin
 * actions, page visits) to ONE private Telegram group — the "Sendyurt logs"
 * group. The destination is pinned by `TELEGRAM_LOG_CHAT_ID`, so this helper
 * can only ever post to that single chat: a bot cannot address a group by
 * name, only by numeric chat id, and we hardcode the id from env.
 *
 * Design mirrors the assistant/mailer graceful-degradation pattern:
 *  • Unconfigured (no token or chat id) → silent no-op. Nothing breaks in
 *    local dev or before the bot is wired up.
 *  • Best-effort + fire-and-forget → never throws, times out fast, and is
 *    called as `void sendTelegramLog(...)` so it never blocks a request or
 *    the user's navigation.
 *
 * `server-only` guarantees the bot token can never be bundled into client
 * code (the build fails if this module is imported from a Client Component).
 */

const TELEGRAM_API = "https://api.telegram.org";
const SEND_TIMEOUT_MS = 4000;

export type LogCategory = "signup" | "login" | "investor" | "admin" | "visit";

const CATEGORY_META: Record<LogCategory, { emoji: string; label: string }> = {
  signup: { emoji: "🆕", label: "New sign-up" },
  login: { emoji: "🔐", label: "Login" },
  investor: { emoji: "💼", label: "Investor inquiry" },
  admin: { emoji: "🛡️", label: "Admin action" },
  visit: { emoji: "👣", label: "Page visit" },
};

export interface TelegramLog {
  category: LogCategory;
  /** Headline line — usually who did it (name / email). */
  title: string;
  /** Optional detail lines. Entries with nullish/empty values are dropped. */
  fields?: Record<string, string | number | null | undefined>;
}

/** Telegram HTML parse mode needs these three characters escaped. */
function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Page-visit logging is the noisy one — allow muting it without a redeploy. */
function isCategoryEnabled(category: LogCategory): boolean {
  if (category === "visit") return process.env.TELEGRAM_LOG_VISITS !== "false";
  return true;
}

function timestamp(): string {
  // Team is in Uzbekistan — stamp events in Tashkent time.
  const formatted = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tashkent",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());
  return `${formatted} (Tashkent)`;
}

function formatMessage({ category, title, fields }: TelegramLog): string {
  const { emoji, label } = CATEGORY_META[category];
  const lines = [`${emoji} <b>${escapeHtml(label)}</b>`, escapeHtml(title)];

  if (fields) {
    for (const [key, raw] of Object.entries(fields)) {
      if (raw == null || raw === "") continue;
      lines.push(`• <b>${escapeHtml(key)}:</b> ${escapeHtml(String(raw))}`);
    }
  }

  lines.push(`<i>${escapeHtml(timestamp())}</i>`);
  return lines.join("\n");
}

/**
 * Post a log line to the pinned "Sendyurt logs" group. No-ops when the bot is
 * not configured (or the category is muted). Never throws — telemetry must not
 * affect the request that produced it. Call it fire-and-forget: `void
 * sendTelegramLog(...)`.
 */
export async function sendTelegramLog(log: TelegramLog): Promise<void> {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_LOG_CHAT_ID;
    if (!token || !chatId) return; // not wired up yet — stay silent
    if (!isCategoryEnabled(log.category)) return;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
    try {
      await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: formatMessage(log),
          parse_mode: "HTML",
          disable_web_page_preview: true,
          // Page visits arrive constantly — deliver them silently so the group
          // isn't a wall of notifications. Meaningful events buzz.
          disable_notification: log.category === "visit",
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  } catch {
    // Swallow everything — a logging failure must never surface to the user.
  }
}
