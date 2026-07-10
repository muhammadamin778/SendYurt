import { NextResponse } from "next/server";

/**
 * Clears a stale NextAuth session (a JWT whose user no longer exists in
 * the database) and returns the visitor to the login page. Server
 * components can't modify cookies during render, so requireUser redirects
 * here instead.
 */
export async function GET(req: Request) {
  const res = NextResponse.redirect(new URL("/login", req.url));
  // Cover both the plain (http/dev) and secure-prefixed (https/prod)
  // cookie names used by NextAuth v4.
  res.cookies.set("next-auth.session-token", "", { maxAge: 0, path: "/" });
  res.cookies.set("__Secure-next-auth.session-token", "", {
    maxAge: 0,
    path: "/",
    secure: true,
  });
  return res;
}
