import createIntlMiddleware from "next-intl/middleware";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "@/i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

// Path segments (after the locale prefix) that require a session.
const PROTECTED = ["dashboard", "budget", "rates", "trust", "household", "welcome", "summary", "help"];
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
  const segment = firstSegmentAfterLocale(req.nextUrl.pathname);
  const locale = localeOf(req.nextUrl.pathname);

  if (PROTECTED.includes(segment) || AUTH_PAGES.includes(segment)) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (PROTECTED.includes(segment) && !token) {
      const url = new URL(`/${locale}/login`, req.url);
      url.searchParams.set("from", req.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
    if (AUTH_PAGES.includes(segment) && token) {
      return NextResponse.redirect(new URL(`/${locale}/dashboard`, req.url));
    }
  }

  return intlMiddleware(req);
}

export const config = {
  // Everything except API routes, Next internals, static files, and the
  // standalone (non-localized) pitch site.
  matcher: ["/((?!api|_next|_vercel|pitch|.*\\..*).*)"],
};
