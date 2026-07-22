"use client";

import { useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";

/**
 * Landing-page "Demo" CTA — signs straight into the seeded demo SENDER account
 * (Supabase Auth) and lands on the dashboard, so visitors can try the app with
 * one click.
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
    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.signInWithPassword({
      email: "demo.sender@sendyurt.uz",
      password: "Demo1234",
    });
    if (error) {
      window.location.assign(`/${locale}/login`);
      return;
    }
    window.location.assign(`/${locale}/dashboard`);
  }

  return (
    <button type="button" onClick={onClick} disabled={busy} className={className}>
      {busy ? "…" : children}
    </button>
  );
}
