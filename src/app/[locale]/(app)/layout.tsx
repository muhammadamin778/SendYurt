import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/Logo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { LogoutButton } from "@/components/LogoutButton";
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
