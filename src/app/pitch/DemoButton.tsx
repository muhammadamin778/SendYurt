"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

/**
 * Landing-page "Demo" CTA — signs straight into the seeded demo SENDER account
 * and lands on the dashboard, so visitors can try the app with one click.
 */
export function DemoButton({
  locale,
  className,
  children,
}: {
  locale: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [busy, setBusy] = useState(false);

  async function onClick() {
    setBusy(true);
    await signIn("credentials", {
      email: "demo.sender@sendyurt.uz",
      password: "Demo1234",
      callbackUrl: `/${locale}/dashboard`,
    });
  }

  return (
    <button type="button" onClick={onClick} disabled={busy} className={className}>
      {busy ? "…" : children}
    </button>
  );
}
