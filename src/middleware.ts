import createIntlMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "@/i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

// Path segments (after the locale prefix) that require a session.
const PROTECTED = ["dashboard", "budget", "rates", "trust", "household", "welcome", "summary", "help", "profile", "admin", "wallet"];
// Auth pages a logged-in user should be bounced away from.
const AUTH_PAGES = ["login", "register", "forgot-password", "reset-password"];

function firstSegmentAfterLocale(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length > 0 && (routing.locales as readonly string[]).includes(parts[0])) {
    return parts[1] ?? "";
  }
  return parts[0] ?? "";
}

function localeOf(pathname: string): string {
  const first = pathname.split("/").filter(Boolean)[0];
  return (routing.locales as readonly string[]).includes(first)
    ? first
    : routing.defaultLocale;
}

export default async function middleware(req: NextRequest) {
  // The site's landing page is the pitch site — serve it at the root URL
  // without a locale prefix or redirect. Preserve the query string so the
  // landing's ?lang= language switch reaches the page.
  if (req.nextUrl.pathname === "/") {
    const url = new URL("/pitch", req.url);
    url.search = req.nextUrl.search;
    return NextResponse.rewrite(url);
  }

  // Let next-intl build the base response (locale routing), then bind a
  // Supabase client to it so a refreshed auth session is written back onto
  // the same response's cookies.
  const res = intlMiddleware(req);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    },
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const segment = firstSegmentAfterLocale(req.nextUrl.pathname);
  const locale = localeOf(req.nextUrl.pathname);

  if (PROTECTED.includes(segment) && !user) {
    const url = new URL(`/${locale}/login`, req.url);
    url.searchParams.set("from", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  if (AUTH_PAGES.includes(segment) && user) {
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, req.url));
  }

  return res;
}

export const config = {
  // Everything except API routes, Next internals, static files, and the
  // standalone (non-localized) pitch site.
  matcher: ["/((?!api|_next|_vercel|pitch|auth|.*\\..*).*)"],
};
