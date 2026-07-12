import { InvestorForm } from "@/components/pitch/InvestorForm";
import { Reveal } from "@/components/pitch/Reveal";

/* ------------------------------------------------------------------ */
/* Small building blocks                                               */
/* ------------------------------------------------------------------ */

function Wordmark() {
  return (
    <span className="inline-flex items-baseline gap-2">
      <svg viewBox="0 0 32 32" className="h-5 w-5 self-center" aria-hidden="true">
        <circle cx="16" cy="4.5" r="2" fill="#E8A33D" />
        <path d="M16 7 29 18.5 H3 Z" fill="#2DD4BF" />
        <path d="M5 20h22v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2Z" fill="#F4EFE4" opacity="0.9" />
      </svg>
      <span className="f-serif text-lg font-semibold tracking-tight text-[#F4EFE4]">
        Send<em className="not-italic text-[#E8A33D]">Yurt</em>
      </span>
    </span>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="f-mono text-[11px] uppercase tracking-[0.28em] text-[#2DD4BF]">
      {children}
    </p>
  );
}

/** Serif display headline; <em> children render as the italic accent. */
function Display({
  children,
  size = "lg",
  tone = "dark",
}: {
  children: React.ReactNode;
  size?: "lg" | "md";
  tone?: "dark" | "light";
}) {
  return (
    <h2
      className={[
        "f-serif font-medium tracking-[-0.015em] [text-wrap:balance]",
        size === "lg"
          ? "text-[clamp(2.25rem,5.5vw,4rem)] leading-[1.06]"
          : "text-[clamp(1.9rem,4vw,3rem)] leading-[1.1]",
        tone === "dark" ? "text-[#F4EFE4]" : "text-[#101828]",
      ].join(" ")}
    >
      {children}
    </h2>
  );
}

function LineIcon({ path }: { path: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6 text-[#2DD4BF]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Hero mockup — a real UI mock, hand-built                            */
/* ------------------------------------------------------------------ */

function PhoneMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[21rem]">
      {/* Peeking family-budget card */}
      <div
        aria-hidden="true"
        className="absolute -right-4 top-24 hidden w-56 rotate-3 rounded-2xl border border-[#F4EFE4]/10 bg-[#111B2E] p-4 shadow-[0_1px_0_rgba(244,239,228,0.06)_inset] sm:block lg:-right-16"
      >
        <p className="f-mono text-[10px] uppercase tracking-[0.2em] text-[#8593AB]">
          Family budget · July
        </p>
        <ul className="mt-3 space-y-2.5">
          {[
            ["Rent", "w-4/5", "#2DD4BF"],
            ["School", "w-3/5", "#E8A33D"],
            ["Medicine", "w-2/5", "#7C9CE8"],
          ].map(([label, width, color]) => (
            <li key={label as string}>
              <div className="flex items-center justify-between text-xs text-[#C6CFDE]">
                <span>{label}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-[#F4EFE4]/10">
                <div
                  className={`h-full rounded-full ${width}`}
                  style={{ backgroundColor: color as string }}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Phone frame */}
      <div className="relative rounded-[2.4rem] border border-[#F4EFE4]/15 bg-[#0E1729] p-2.5 shadow-[0_0_60px_rgba(45,212,191,0.07)]">
        <div className="rounded-[2rem] border border-[#F4EFE4]/10 bg-[#0B1220] px-5 pb-7 pt-4">
          {/* Notch line */}
          <div className="mx-auto mb-5 h-1 w-16 rounded-full bg-[#F4EFE4]/15" aria-hidden="true" />

          <p className="f-mono text-[10px] uppercase tracking-[0.22em] text-[#8593AB]">
            New transfer
          </p>

          {/* Send → receive */}
          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-[#F4EFE4]/10 bg-[#111B2E] px-4 py-3.5">
              <p className="text-[11px] text-[#8593AB]">You send</p>
              <p className="f-serif mt-0.5 text-2xl font-medium text-[#F4EFE4]">€500</p>
            </div>
            <div className="flex justify-center" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#2DD4BF]" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14m0 0l-5-5m5 5l5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="rounded-xl border border-[#2DD4BF]/25 bg-[#2DD4BF]/[0.06] px-4 py-3.5">
              <p className="text-[11px] text-[#8593AB]">Family receives</p>
              <p className="f-serif mt-0.5 text-2xl font-medium text-[#F4EFE4]">
                6,750,000 <span className="text-base text-[#9DA9BE]">soʻm</span>
              </p>
            </div>
          </div>

          {/* Best route */}
          <div className="mt-4 rounded-xl border border-[#F4EFE4]/10 bg-[#111B2E] px-4 py-3">
            <p className="f-mono text-[10px] uppercase tracking-[0.18em] text-[#E8A33D]">
              Best route found
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[#C6CFDE]">
              Kapital Card · saves <span className="font-semibold text-[#F4EFE4]">€18</span> vs
              your bank · arrives in ~10 min
            </p>
            <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-[#4ADE80]/30 bg-[#4ADE80]/10 px-2.5 py-1">
              <svg viewBox="0 0 24 24" className="h-3 w-3 text-[#4ADE80]" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="f-mono text-[10px] uppercase tracking-[0.14em] text-[#4ADE80]">
                Trust Score 96 · Verified
              </span>
            </div>
          </div>

          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            className="mt-4 w-full cursor-default rounded-xl bg-[#E8A33D] py-3 text-sm font-semibold text-[#0B1220]"
          >
            Send €500
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

const MARQUEE_TAGS = [
  "Real-time rates",
  "Trust Score",
  "Family Budget",
  "Uzbek & Russian",
  "No hidden fees",
  "Works offline (PWA)",
  "Scam protection",
  "Best-route finder",
];

const STEPS = [
  {
    n: "01",
    title: "Enter amount & destination",
    body: "Tell SendYurt how much you're sending and where it lands — Tashkent, Samarkand, a village in Fergana.",
    icon: "M12 3v12m0 0l-4-4m4 4l4-4M5 21h14",
  },
  {
    n: "02",
    title: "Compare routes + Trust Scores",
    body: "Banks, cards and money-transfer operators — ranked by what your family actually receives, each with a trust rating.",
    icon: "M4 17l5-5 4 4 7-8M15 8h5v5",
  },
  {
    n: "03",
    title: "Send via the cheapest, safest route",
    body: "One tap on the winning route. No hidden margin, no guesswork, no queue at a kiosk.",
    icon: "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z",
  },
  {
    n: "04",
    title: "Track it together in the Family Budget",
    body: "The money arrives into a plan both sides can see — rent, school, medicine — not into a black box.",
    icon: "M4 21V10l8-6 8 6v11M9 21v-6h6v6",
  },
];

const FEATURES = [
  {
    tag: "LIVE RATES",
    title: "Rate & Route Finder",
    body: "Compares every channel in real time for the cheapest, fastest transfer.",
    icon: "M4 17l5-5 4 4 7-8M15 8h5v5",
  },
  {
    tag: "ANTI-FRAUD",
    title: "Trust Score",
    body: "Rates providers and agents on hidden fees, speed and complaint history so migrants dodge scams.",
    icon: "M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6zM9 12l2 2 4-4",
  },
  {
    tag: "SHARED FINANCE",
    title: "Family Budget Dashboard",
    body: "Migrant and family share one plan — rent, school, medicine — so money reaches its purpose.",
    icon: "M4 21V10l8-6 8 6v11M9 21v-6h6v6",
  },
  {
    tag: "LOCALIZED",
    title: "Uzbek & Russian Native",
    body: "Built in the languages migrants actually use, not translated as an afterthought.",
    icon: "M3 5h12M9 3v2m1.5 14L15 9l4.5 10M12 19h6M5 9c2.5 4 6 7 10 9",
  },
  {
    tag: "SMART ALERTS",
    title: "Rate-Drop Alerts",
    body: "Get pinged the moment a better route opens up for your usual transfer.",
    icon: "M18 9a6 6 0 10-12 0c0 5-2 6-2 6h16s-2-1-2-6M10.3 19a2 2 0 003.4 0",
  },
  {
    tag: "PWA",
    title: "No App Store Needed",
    body: "Installs as a PWA, works on any phone, sips data on weak connections.",
    icon: "M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2zM11 18h2",
  },
];

const METRICS = [
  ["$16B+", "Remittance market"],
  ["~20%", "Of Uzbekistan's GDP"],
  ["2M+", "Migrants abroad"],
  ["0", "Trust-first competitors"],
];

export default function PitchPage() {
  return (
    <div className="relative">
      {/* ---------------------------------------------------------- */}
      {/* 1 · Sticky nav                                              */}
      {/* ---------------------------------------------------------- */}
      <header className="hairline sticky top-0 z-50 border-b bg-[#0B1220]/85 backdrop-blur-md">
        <nav
          aria-label="Main"
          className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5"
        >
          <a href="#top" aria-label="SendYurt — back to top">
            <Wordmark />
          </a>
          <div className="hidden items-center gap-7 text-[13px] text-[#9DA9BE] md:flex">
            <a href="#problem" className="transition-colors hover:text-[#F4EFE4]">Problem</a>
            <a href="#how" className="transition-colors hover:text-[#F4EFE4]">How it works</a>
            <a href="#features" className="transition-colors hover:text-[#F4EFE4]">Features</a>
            <a href="#investors" className="transition-colors hover:text-[#F4EFE4]">For investors</a>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/en/login"
              className="hidden text-[13px] font-medium text-[#9DA9BE] transition-colors hover:text-[#F4EFE4] sm:inline"
            >
              Log in
            </a>
            <a
              href="/en/register"
              className="rounded-full bg-[#E8A33D] px-4 py-1.5 text-[13px] font-semibold text-[#0B1220] transition-colors hover:bg-[#F0B458]"
            >
              Get early access
            </a>
          </div>
        </nav>
      </header>

      <main id="top">
        {/* -------------------------------------------------------- */}
        {/* 2 · Hero                                                  */}
        {/* -------------------------------------------------------- */}
        <section className="hero-atmosphere grain relative overflow-hidden">
          <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 pb-20 pt-16 sm:pt-24 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:pb-28">
            <div>
              <Reveal>
                <Eyebrow>Uzbekistan · Fintech · 2026</Eyebrow>
              </Reveal>
              <Reveal delay={80}>
                <h1 className="f-serif mt-5 text-[clamp(2.5rem,7vw,5rem)] font-medium leading-[1.05] tracking-[-0.02em] text-[#F4EFE4] [text-wrap:balance]">
                  Send money home <em className="font-normal">smarter</em>, not{" "}
                  <em className="font-normal">blind</em>.
                </h1>
              </Reveal>
              <Reveal delay={160}>
                <p className="mt-6 max-w-md text-[17px] leading-relaxed text-[#9DA9BE]">
                  SendYurt is the money co-pilot for Uzbek migrants and the families they
                  support — the cheapest, safest route home, a trust rating on every
                  provider, and one budget the whole family shares.
                </p>
              </Reveal>
              <Reveal delay={240}>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <a
                    href="/en/register"
                    className="rounded-full bg-[#E8A33D] px-6 py-3 text-sm font-semibold text-[#0B1220] transition-colors hover:bg-[#F0B458]"
                  >
                    Get early access
                  </a>
                  <a
                    href="#how"
                    className="hairline-strong rounded-full border px-6 py-3 text-sm font-semibold text-[#F4EFE4] transition-colors hover:border-[#F4EFE4]/40"
                  >
                    See how it works
                  </a>
                </div>
              </Reveal>
              <Reveal delay={320}>
                <dl className="mt-10 flex flex-wrap gap-x-8 gap-y-4">
                  {[
                    ["$16B+", "Annual remittances"],
                    ["~2M+", "Migrants abroad"],
                    ["6%", "Avg fee lost per transfer"],
                  ].map(([value, label]) => (
                    <div key={label}>
                      <dt className="f-mono order-2 mt-1 text-[10px] uppercase tracking-[0.18em] text-[#8593AB]">
                        {label}
                      </dt>
                      <dd className="f-serif text-2xl font-medium text-[#F4EFE4]">{value}</dd>
                    </div>
                  ))}
                </dl>
              </Reveal>
            </div>

            <Reveal delay={200} className="lg:justify-self-end">
              <PhoneMockup />
            </Reveal>
          </div>
        </section>

        {/* -------------------------------------------------------- */}
        {/* 3 · Marquee                                               */}
        {/* -------------------------------------------------------- */}
        <section aria-label="Product highlights" className="hairline border-y py-5">
          <div className="marquee">
            <div className="marquee-track">
              {[0, 1].map((copy) => (
                <ul
                  key={copy}
                  aria-hidden={copy === 1}
                  className="flex shrink-0 items-center"
                >
                  {MARQUEE_TAGS.map((tag) => (
                    <li
                      key={tag}
                      className="f-mono flex items-center gap-6 pr-6 text-[12px] uppercase tracking-[0.22em] text-[#8593AB]"
                    >
                      <span>{tag}</span>
                      <span className="text-[#2DD4BF]" aria-hidden="true">·</span>
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------- */}
        {/* 4 · Problem                                               */}
        {/* -------------------------------------------------------- */}
        <section id="problem" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-24 lg:py-32">
          <Reveal>
            <Eyebrow>The problem</Eyebrow>
            <div className="mt-5 max-w-2xl">
              <Display>
                Migrants are <em className="font-normal">bleeding money</em> in the dark.
              </Display>
            </div>
            <p className="mt-6 max-w-xl text-[17px] leading-relaxed">
              Every transfer home runs a gauntlet of hidden margins, bad rates and
              informal agents — and the family receiving it has no view of any of it.
            </p>
          </Reveal>
          <div className="mt-14 grid gap-px overflow-hidden rounded-2xl bg-[#F4EFE4]/[0.08] sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["6–8%", "Lost to fees & FX margin", "on a typical corridor transfer"],
              ["$1B+", "Burned every year", "in avoidable transfer costs"],
              ["1 in 5", "Has met a scam or 'agent'", "with no way to check reputations"],
              ["0", "Shared visibility", "between sender and family today"],
            ].map(([value, label, sub], i) => (
              <Reveal key={label} delay={i * 80}>
                <div className="h-full bg-[#0E1729] p-7">
                  <p className="f-serif text-[clamp(2.5rem,4vw,3.5rem)] font-medium leading-none text-[#F4EFE4]">
                    {value}
                  </p>
                  <p className="f-mono mt-4 text-[11px] uppercase tracking-[0.18em] text-[#E8A33D]">
                    {label}
                  </p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-[#8593AB]">{sub}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* -------------------------------------------------------- */}
        {/* 5 · How it works                                          */}
        {/* -------------------------------------------------------- */}
        <section id="how" className="hairline scroll-mt-20 border-t">
          <div className="mx-auto max-w-6xl px-5 py-24 lg:py-32">
            <Reveal>
              <Eyebrow>How it works</Eyebrow>
              <div className="mt-5 max-w-2xl">
                <Display>
                  Four steps to money that <em className="font-normal">arrives whole</em>.
                </Display>
              </div>
            </Reveal>
            <ol className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
              {STEPS.map((step, i) => (
                <Reveal key={step.n} delay={i * 90}>
                  <li className="h-full">
                    <p className="f-mono text-[12px] uppercase tracking-[0.2em] text-[#2DD4BF]">
                      {step.n} <span aria-hidden="true">——</span>
                    </p>
                    <div className="mt-5">
                      <LineIcon path={step.icon} />
                    </div>
                    <h3 className="mt-4 text-[15px] font-semibold text-[#F4EFE4]">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-[14px] leading-relaxed text-[#8593AB]">
                      {step.body}
                    </p>
                  </li>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* -------------------------------------------------------- */}
        {/* 6 · Features grid                                         */}
        {/* -------------------------------------------------------- */}
        <section id="features" className="hairline scroll-mt-20 border-t">
          <div className="mx-auto max-w-6xl px-5 py-24 lg:py-32">
            <Reveal>
              <Eyebrow>Features</Eyebrow>
              <div className="mt-5 max-w-2xl">
                <Display>
                  Everything a migrant family needs.{" "}
                  <em className="font-normal">Nothing they don&apos;t.</em>
                </Display>
              </div>
            </Reveal>
            <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature, i) => (
                <Reveal key={feature.title} delay={(i % 3) * 80}>
                  <article className="lift hairline relative h-full rounded-2xl border bg-[#0E1729] p-7">
                    <span className="f-mono absolute right-5 top-5 text-[10px] uppercase tracking-[0.18em] text-[#8593AB]">
                      {feature.tag}
                    </span>
                    <LineIcon path={feature.icon} />
                    <h3 className="mt-5 text-[16px] font-semibold text-[#F4EFE4]">
                      {feature.title}
                    </h3>
                    <p className="mt-2 text-[14px] leading-relaxed text-[#8593AB]">
                      {feature.body}
                    </p>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------- */}
        {/* 7 · Opportunity                                           */}
        {/* -------------------------------------------------------- */}
        <section id="investors" className="hairline scroll-mt-20 border-t">
          <div className="mx-auto max-w-6xl px-5 py-24 lg:py-32">
            <Reveal>
              <Eyebrow>The opportunity</Eyebrow>
            </Reveal>
            <div className="mt-12 grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
              {METRICS.map(([value, label], i) => (
                <Reveal key={label} delay={i * 80}>
                  <div>
                    <p className="f-serif text-[clamp(3rem,6vw,4.5rem)] font-medium leading-none text-[#F4EFE4]">
                      {value}
                    </p>
                    <p className="f-mono mt-4 text-[11px] uppercase tracking-[0.2em] text-[#8593AB]">
                      {label}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
            <Reveal delay={200}>
              <p className="f-mono mt-12 text-[10px] uppercase tracking-[0.16em] text-[#5D6B84]">
                Directional market estimates — verify against current World Bank / CBU data
                before investor distribution.
              </p>
            </Reveal>

            {/* Working investor inquiry */}
            <div className="mt-16 grid items-start gap-10 border-t border-[#F4EFE4]/[0.08] pt-16 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
              <Reveal>
                <Display size="md">
                  Building the <em className="font-normal">trust rail</em> for a $16B corridor.
                </Display>
                <p className="mt-5 max-w-md text-[16px] leading-relaxed">
                  We&apos;re raising to expand coverage across the top remittance corridors and
                  deepen the Trust Score data moat. Tell us what you&apos;d like to see — the
                  founders read every note.
                </p>
              </Reveal>
              <Reveal delay={120}>
                <InvestorForm />
              </Reveal>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------- */}
        {/* 8 · Pull quote                                            */}
        {/* -------------------------------------------------------- */}
        <section className="hairline border-t">
          <div className="mx-auto max-w-4xl px-5 py-24 text-center lg:py-32">
            <Reveal>
              <blockquote className="f-serif text-[clamp(1.75rem,4vw,2.9rem)] font-medium leading-[1.25] tracking-[-0.01em] text-[#F4EFE4] [text-wrap:balance]">
                &ldquo;The financial co-pilot in every Uzbek migrant&apos;s pocket —{" "}
                <em className="font-normal text-[#E8A33D]">saving families millions</em> in
                hidden fees.&rdquo;
              </blockquote>
            </Reveal>
          </div>
        </section>

        {/* -------------------------------------------------------- */}
        {/* 9 · CTA — the one contrast flip                           */}
        {/* -------------------------------------------------------- */}
        <section id="cta" className="scroll-mt-20 bg-[#F4EFE4]">
          <div className="mx-auto max-w-6xl px-5 py-24 lg:py-28">
            <Reveal>
              <div className="mx-auto max-w-2xl text-center">
                <Display tone="light">
                  Ready to send home <em className="font-normal">smarter</em>?
                </Display>
                <p className="mt-5 text-[17px] leading-relaxed text-[#4B5565]">
                  We&apos;re onboarding pilot families across the top remittance corridors
                  now. Sit with us on the sender&apos;s side of the table.
                </p>
                <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                  <a
                    href="/en/register"
                    className="rounded-full bg-[#B25E1E] px-7 py-3.5 text-sm font-semibold text-[#FDF9F0] transition-colors hover:bg-[#9A4E15]"
                  >
                    Join the pilot
                  </a>
                  <a
                    href="#investors"
                    className="rounded-full border border-[#101828]/25 px-7 py-3.5 text-sm font-semibold text-[#101828] transition-colors hover:border-[#101828]/50"
                  >
                    Investor inquiries <span aria-hidden="true">→</span>
                  </a>
                </div>
                <p className="f-mono mt-10 text-[10px] uppercase tracking-[0.2em] text-[#8A94A6]">
                  President Tech Award 2026 · Incubation track
                </p>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      {/* ------------------------------------------------------------ */}
      {/* 10 · Footer                                                   */}
      {/* ------------------------------------------------------------ */}
      <footer className="hairline border-t">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Wordmark />
            <p className="mt-3 max-w-[16rem] text-[13px] leading-relaxed text-[#8593AB]">
              The money co-pilot for Uzbek migrants and the families they support.
            </p>
          </div>
          {(
            [
              ["Product", [["Rate finder", "/en/rates"], ["Trust Score", "/en/trust"], ["Family Budget", "/en/budget"], ["How it works", "#how"]]],
              ["Company", [["The problem", "#problem"], ["For investors", "#investors"], ["Get early access", "/en/register"]]],
              ["Contact", [["Telegram — @sendyurt", "https://t.me/sendyurt"], ["hello@sendyurt.uz", "mailto:hello@sendyurt.uz"]]],
            ] as const
          ).map(([group, links]) => (
            <nav key={group} aria-label={group}>
              <h3 className="f-mono text-[11px] uppercase tracking-[0.2em] text-[#5D6B84]">
                {group}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {links.map(([label, href]) => (
                  <li key={label}>
                    <a
                      href={href}
                      className="text-[13px] text-[#9DA9BE] transition-colors hover:text-[#F4EFE4]"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="hairline border-t">
          <p className="f-mono mx-auto max-w-6xl px-5 py-6 text-[11px] uppercase tracking-[0.18em] text-[#5D6B84]">
            © 2026 SendYurt · Tashkent, Uzbekistan
          </p>
        </div>
      </footer>
    </div>
  );
}
