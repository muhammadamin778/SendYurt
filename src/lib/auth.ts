import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, clearAttempts, LIMITS, recordAttempt } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validators";

function requestIp(headers: Record<string, string | string[] | undefined> | undefined): string {
  const fwd = headers?.["x-forwarded-for"];
  const first = Array.isArray(fwd) ? fwd[0] : fwd;
  if (first) return first.split(",")[0].trim();
  const real = headers?.["x-real-ip"];
  return (Array.isArray(real) ? real[0] : real) ?? "unknown";
}

export const authOptions: NextAuthOptions = {
  session: {
    // Credentials provider requires JWT sessions in NextAuth v4.
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  pages: {
    // NextAuth redirects here on auth errors; locale prefix is added by
    // middleware when the user lands on it.
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        // Throttle by account and by source IP. Only failed attempts
        // consume budget; a successful login clears the account's counter.
        // The thrown message becomes the error code the login form maps to
        // a "try again later" message.
        const emailKey = `login:email:${parsed.data.email}`;
        const ipKey = `login:ip:${requestIp(req?.headers)}`;
        if (
          !checkRateLimit(emailKey, LIMITS.login).allowed ||
          !checkRateLimit(ipKey, LIMITS.login).allowed
        ) {
          throw new Error("rate_limited");
        }

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });
        // Run compare against a dummy hash when the user is missing so the
        // response time doesn't reveal whether an email is registered.
        const hash =
          user?.passwordHash ??
          "$2a$12$C6UzMDM.H6dfI/f/IKcEeO7ZJf5nqYFDqMbF1sB4FBW9jXvXW3u1u";
        const valid = await compare(parsed.data.password, hash);
        if (!user || !valid) {
          recordAttempt(emailKey);
          recordAttempt(ipKey);
          return null;
        }
        clearAttempts(emailKey);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          householdId: user.householdId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.householdId = user.householdId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.householdId = token.householdId;
      }
      return session;
    },
  },
};
