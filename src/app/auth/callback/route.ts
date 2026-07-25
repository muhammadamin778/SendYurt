import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { sendTelegramLog } from "@/lib/telegram";

/**
 * OAuth + email-confirmation callback. Supabase redirects here with a `?code`
 * after the user confirms their email or completes a Google sign-in; we
 * exchange that code for a session (setting the auth cookies) and forward the
 * user on. Lives outside `[locale]` and is excluded from the i18n middleware
 * so the code isn't lost to a locale redirect.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error_description") ?? searchParams.get("error");
  // Only allow app-internal redirect targets.
  const nextParam = searchParams.get("next");
  const next = nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/en/dashboard";

  if (error) {
    return NextResponse.redirect(`${origin}/en/login?error=${encodeURIComponent(error)}`);
  }

  if (code) {
    const supabase = createServerSupabase();
    const { data: exchange, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (!exchangeError) {
      // Fires for Google sign-in and email-confirmation link clicks — both are
      // a session start. (A brand-new user also gets a separate "sign-up" log
      // from the identity bridge the first time the app loads.)
      const user = exchange?.user;
      if (user?.email) {
        await sendTelegramLog({
          category: "login",
          title: user.email,
          fields: { Method: "Google / email link" },
        });
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
    return NextResponse.redirect(`${origin}/en/login?error=${encodeURIComponent(exchangeError.message)}`);
  }

  return NextResponse.redirect(`${origin}/en/login`);
}
