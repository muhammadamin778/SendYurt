import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/Logo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { LogoutButton } from "@/components/LogoutButton";
import { NotificationBell } from "@/components/NotificationBell";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DesktopNav, MobileNav } from "@/components/AppNav";
import { requireUser } from "@/lib/session";

// Everything in this group is per-user, per-household data behind auth —
// it must never be statically prerendered.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-sand-200 bg-white/90 backdrop-blur print:hidden">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" aria-label="SendYurt">
              <Logo />
            </Link>
            <DesktopNav />
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/help"
              aria-label="Help"
              className="rounded-lg border border-sand-300 bg-white p-2 text-sand-800 transition-colors hover:bg-sand-100"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M9.5 9.3a2.5 2.5 0 114.1 1.9c-.8.7-1.6 1.2-1.6 2.3M12 16.8v.2" strokeLinecap="round" />
              </svg>
            </Link>
            <NotificationBell />
            <ThemeToggle />
            <LanguageSwitcher />
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* pb clears the fixed mobile bottom nav */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-24 md:pb-10">
        {children}
      </main>

      <MobileNav />
    </div>
  );
}
