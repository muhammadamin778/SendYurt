import { Link } from "@/i18n/navigation";
import { YurtMark } from "@/components/Logo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { AuthHero } from "@/components/auth/AuthHero";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-shell min-h-screen bg-[#e9edf3] p-0 sm:p-5">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl overflow-hidden bg-white shadow-[0_24px_70px_-32px_rgba(15,23,42,0.45)] sm:min-h-[calc(100vh-2.5rem)] sm:rounded-[28px] lg:grid-cols-2">
        {/* Left · form */}
        <div className="flex flex-col px-6 py-8 sm:px-12 sm:py-10">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" aria-label="SendYurt" className="flex items-center gap-2.5">
              <YurtMark className="h-11 w-auto" />
              <span className="font-display text-[22px] font-bold tracking-tight text-[#0f172a]">SendYurt</span>
            </Link>
            <LanguageSwitcher />
          </div>

          <div className="flex flex-1 items-center py-8">
            <div className="w-full max-w-md">{children}</div>
          </div>
        </div>

        {/* Right · hero (hidden on small screens) */}
        <aside className="relative hidden overflow-hidden bg-[linear-gradient(135deg,#006c49_0%,#2d3133_100%)] lg:flex lg:items-center lg:justify-center lg:p-16">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <div className="absolute -right-16 top-1/4 h-[400px] w-[400px] rounded-full bg-[#9df4c8] opacity-10 blur-[120px]" />
            <div className="absolute -left-16 bottom-1/4 h-[400px] w-[400px] rounded-full bg-[#0b1220] opacity-20 blur-[120px]" />
          </div>
          <AuthHero />
        </aside>
      </div>
    </div>
  );
}
