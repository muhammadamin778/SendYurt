import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { getAppSession } from "@/lib/supabase/app-session";
import {
  ASSISTANT_KNOWLEDGE,
  ASSISTANT_LOCALES,
  loadHouseholdContext,
  matchGuideTopic,
  renderContext,
} from "@/lib/assistant";
import { LIMITS, rateLimit } from "@/lib/rate-limit";

const bodySchema = z.object({
  locale: z.enum(ASSISTANT_LOCALES),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(2000),
      }),
    )
    .min(1)
    .max(12),
});

const MODEL = process.env.ASSISTANT_MODEL || "claude-opus-4-8";

// When Claude API credentials are missing or rejected, remember it briefly
// so every message doesn't pay a failing round-trip; retry after a while in
// case a key was added to the environment.
let aiUnavailableUntil = 0;

function getClient(): Anthropic | null {
  if (Date.now() < aiUnavailableUntil) return null;
  try {
    // Zero-arg constructor resolves ANTHROPIC_API_KEY / ANTHROPIC_AUTH_TOKEN
    // or a local credential profile.
    return new Anthropic();
  } catch {
    aiUnavailableUntil = Date.now() + 10 * 60 * 1000;
    return null;
  }
}

export async function POST(req: Request) {
  const session = await getAppSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const limit = rateLimit(`assistant:${session.user.id}`, LIMITS.assistant);
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
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation" }, { status: 400 });
  }
  const { locale, messages } = parsed.data;

  const client = getClient();
  if (client) {
    try {
      const context = await loadHouseholdContext(
        session.user.id,
        session.user.householdId,
      );

      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system: [
          {
            type: "text",
            text: ASSISTANT_KNOWLEDGE,
            cache_control: { type: "ephemeral" },
          },
          { type: "text", text: renderContext(context, locale) },
        ],
        messages,
      });

      if (response.stop_reason === "refusal") {
        return await guideAnswer(locale, messages[messages.length - 1].content, true);
      }

      const reply = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("")
        .trim();
      if (reply) {
        return NextResponse.json({ reply, source: "ai" });
      }
      return await guideAnswer(locale, messages[messages.length - 1].content, true);
    } catch (error) {
      if (
        error instanceof Anthropic.AuthenticationError ||
        error instanceof Anthropic.PermissionDeniedError
      ) {
        // No valid credentials — switch to the offline guide for a while.
        aiUnavailableUntil = Date.now() + 10 * 60 * 1000;
      } else {
        console.error("assistant AI call failed", error);
      }
      return await guideAnswer(locale, messages[messages.length - 1].content, true);
    }
  }

  return await guideAnswer(locale, messages[messages.length - 1].content, false);
}

/**
 * Offline guide answer: localized help content matched by keywords. Marked
 * `source: "guide"` so the UI can hint that the full AI isn't connected.
 */
async function guideAnswer(locale: string, question: string, degraded: boolean) {
  const tHelp = await getTranslations({ locale, namespace: "help" });
  const tAssistant = await getTranslations({ locale, namespace: "assistant" });

  const topic = matchGuideTopic(question);
  const reply = topic
    ? `${tHelp(`${topic}.a`)}`
    : tAssistant("guideFallback");

  return NextResponse.json({ reply, source: "guide", degraded });
}
