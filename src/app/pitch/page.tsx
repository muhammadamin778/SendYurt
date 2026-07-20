import { HeroVideo } from "@/components/pitch/HeroVideo";
import { InvestorForm } from "@/components/pitch/InvestorForm";
import { Reveal } from "@/components/pitch/Reveal";
import { DemoButton } from "./DemoButton";
import { PITCH, PITCH_LANGS, resolveLang, type PitchLang } from "./content";

/* ------------------------------------------------------------------ */
/* Small building blocks                                               */
/* ------------------------------------------------------------------ */

function Wordmark({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const ink = tone === "dark" ? "#0B1A30" : "#f7f9fb";
  return (
    <span className="inline-flex items-center gap-2">
      <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#0a7c53]">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
          <path d="M12 4 20 11H4Z" fill="#f7f9fb" />
          <path d="M6 13h12v5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 18Z" fill="#f7f9fb" opacity="0.85" />
        </svg>
      </span>
      <span className="f-display text-[19px] font-bold tracking-tight" style={{ color: ink }}>
        Send<span className="text-[#0a7c53]">Yurt</span>
      </span>
    </span>
  );
}

function Chip({
  children,
  bg = "#d1fae5",
  color = "#065f3e",
}: {
  children: React.ReactNode;
  bg?: string;
  color?: string;
}) {
  return (
    <span className="chip" style={{ backgroundColor: bg, color }}>
      {children}
    </span>
  );
}

/** Renders an accented headline fragment: plain + coral emphasis + plain. */
function Em({ v, accent = "#0a7c53" }: { v: { a: string; em: string; b: string }; accent?: string }) {
  return (
    <>
      {v.a}
      <b className="font-bold" style={{ color: accent }}>{v.em}</b>
      {v.b}
    </>
  );
}

function Display({
  children,
  size = "lg",
  color = "#0B1A30",
}: {
  children: React.ReactNode;
  size?: "lg" | "md";
  color?: string;
}) {
  return (
    <h2
      className={[
        "f-display font-bold tracking-[-0.02em] [text-wrap:balance]",
        size === "lg"
          ? "text-[clamp(2.4rem,5.6vw,4.25rem)] leading-[1.02]"
          : "text-[clamp(1.9rem,4vw,3rem)] leading-[1.05]",
      ].join(" ")}
      style={{ color }}
    >
      {children}
    </h2>
  );
}

function LineIcon({ path, color = "#0B1A30" }: { path: string; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Visual constants (language-independent: icons, colours, figures)    */
/* ------------------------------------------------------------------ */

const PROBLEM_VIS: [string, string, string][] = [
  ["6–8%", "#d1fae5", "#065f3e"],
  ["$1B+", "#FFE4AC", "#7C5310"],
  ["1 in 5", "#ccfbf1", "#0f766e"],
  ["0", "#C8EFD8", "#0C6B49"],
];

const STEP_ICONS = [
  "M12 3v12m0 0l-4-4m4 4l4-4M5 21h14",
  "M4 17l5-5 4 4 7-8M15 8h5v5",
  "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z",
  "M4 21V10l8-6 8 6v11M9 21v-6h6v6",
];

const FEATURE_VIS: { icon: string; bg: string; ink: string }[] = [
  { icon: "M4 17l5-5 4 4 7-8M15 8h5v5", bg: "#FFE4AC", ink: "#7C5310" },
  { icon: "M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6zM9 12l2 2 4-4", bg: "#C8EFD8", ink: "#0C6B49" },
  { icon: "M4 21V10l8-6 8 6v11M9 21v-6h6v6", bg: "#ccfbf1", ink: "#0f766e" },
  { icon: "M3 5h12M9 3v2m1.5 14L15 9l4.5 10M12 19h6M5 9c2.5 4 6 7 10 9", bg: "#dcfce7", ink: "#166534" },
  { icon: "M18 9a6 6 0 10-12 0c0 5-2 6-2 6h16s-2-1-2-6M10.3 19a2 2 0 003.4 0", bg: "#d1fae5", ink: "#065f3e" },
  { icon: "M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2zM11 18h2", bg: "#FFFFFF", ink: "#0B1A30" },
];

const METRIC_VALUES = ["$16B+", "~20%", "2M+", "0"];

const BADGE_COLORS: [string, string][] = [
  ["#C8EFD8", "#0C6B49"],
  ["#ccfbf1", "#0f766e"],
  ["#FFE4AC", "#7C5310"],
  ["#dcfce7", "#166534"],
];

/** Language switcher — links stay on "/" and swap the ?lang= param. */
function LangSwitch({ lang }: { lang: PitchLang }) {
  return (
    <div className="flex items-center gap-0.5 rounded-full border border-[#0B1A30]/12 p-0.5">
      {PITCH_LANGS.map(({ code, label }) => (
        <a
          key={code}
          href={code === "en" ? "/" : `/?lang=${code}`}
          className={[
            "rounded-full px-2 py-1 text-[11px] font-semibold transition-colors sm:px-2.5 sm:text-[12px]",
            code === lang ? "bg-[#0B1A30] text-[#f7f9fb]" : "text-[#5A6B82] hover:text-[#0B1A30]",
          ].join(" ")}
        >
          {label}
        </a>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function PitchPage({
  searchParams,
}: {
  searchParams: { lang?: string };
}) {
  const lang = resolveLang(searchParams?.lang);
  const c = PITCH[lang];
  // Prefix internal app routes with the chosen locale; leave anchors and
  // external links untouched.
  const href = (h: string) => (h.startsWith("/") ? `/${lang}${h}` : h);

  return (
    <div className="relative">
      {/* 1 · Sticky nav */}
      <header className="hairline sticky top-0 z-50 border-b bg-[#f7f9fb]/85 backdrop-blur-md">
        <nav aria-label="Main" className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:gap-3 sm:px-5">
          <a href="#top" aria-label="SendYurt — back to top">
            <Wordmark />
          </a>
          <div className="hidden items-center gap-8 text-[14px] font-medium text-[#5A6B82] lg:flex">
            <a href="#problem" className="transition-colors hover:text-[#0B1A30]">{c.nav.problem}</a>
            <a href="#how" className="transition-colors hover:text-[#0B1A30]">{c.nav.how}</a>
            <a href="#features" className="transition-colors hover:text-[#0B1A30]">{c.nav.features}</a>
            <a href="#investors" className="transition-colors hover:text-[#0B1A30]">{c.nav.investors}</a>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <LangSwitch lang={lang} />
            <a href={href("/login")} className="whitespace-nowrap text-[13px] font-semibold text-[#0B1A30] transition-colors hover:text-[#0a7c53] sm:text-[14px]">
              {c.nav.login}
            </a>
            <DemoButton locale={lang} className="btn btn-coral px-3.5 py-2 text-[13px] sm:px-5 sm:py-2.5 sm:text-[14px]">
              {c.nav.cta}
            </DemoButton>
          </div>
        </nav>
      </header>

      <main id="top">
        {/* 2 · Hero */}
        <section className="relative overflow-hidden">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-14 sm:pt-20 lg:grid-cols-[1.02fr_0.98fr] lg:gap-10 lg:pb-28">
            <div>
              <Reveal><Chip>{c.hero.chip}</Chip></Reveal>
              <Reveal delay={80}>
                <h1 className="f-display mt-6 text-[clamp(2.7rem,7vw,5.25rem)] font-bold leading-[0.98] tracking-[-0.03em] text-[#0B1A30] [text-wrap:balance]">
                  <Em v={c.hero.title} />
                </h1>
              </Reveal>
              <Reveal delay={160}>
                <p className="mt-6 max-w-md text-[18px] leading-relaxed text-[#5A6B82]">{c.hero.sub}</p>
              </Reveal>
              <Reveal delay={240}>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <DemoButton locale={lang} className="btn btn-coral px-7 py-3.5 text-[15px]">{c.hero.ctaPrimary}</DemoButton>
                  <a href="#how" className="btn btn-ghost px-7 py-3.5 text-[15px]">{c.hero.ctaSecondary}</a>
                </div>
              </Reveal>
              <Reveal delay={320}>
                <dl className="mt-10 flex flex-wrap gap-x-9 gap-y-4">
                  {c.hero.stats.map(([value, label]) => (
                    <div key={label}>
                      <dd className="f-display text-2xl font-bold text-[#0B1A30]">{value}</dd>
                      <dt className="mt-1 text-[12px] font-medium uppercase tracking-wide text-[#8A94A6]">{label}</dt>
                    </div>
                  ))}
                </dl>
              </Reveal>
            </div>

            <Reveal delay={200} className="lg:justify-self-end">
              <div className="relative mx-auto w-full max-w-[30rem]">
                <div aria-hidden="true" className="absolute -inset-3 -rotate-2 rounded-[2.75rem] bg-[#0a7c53]/12 sm:-inset-5" />
                <div className="absolute -right-3 -top-3 hidden rotate-3 sm:block">
                  <Chip bg="#0B1A30" color="#f7f9fb">{c.hero.trustBadge}</Chip>
                </div>
                <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] border-[6px] border-[#0B1A30] bg-[#0B1A30] shadow-[0_30px_60px_-25px_rgba(11,26,48,0.55)]">
                  <HeroVideo />
                </div>
                <div className="absolute -bottom-4 -left-3 hidden -rotate-2 rounded-2xl bg-white p-3.5 shadow-[0_16px_36px_-18px_rgba(11,26,48,0.5)] sm:block">
                  <p className="text-[11px] font-medium text-[#8A94A6]">{c.hero.receivesLabel}</p>
                  <p className="f-display text-lg font-bold text-[#0B1A30]">
                    6,750,000 <span className="text-[13px] font-medium text-[#5A6B82]">soʻm</span>
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* 3 · Trust badges */}
        <section aria-label="Trust signals" className="mx-auto max-w-6xl px-5 pb-6">
          <Reveal>
            <div className="flex flex-wrap items-center gap-2.5">
              {c.badges.map((b, i) => (
                <Chip key={i} bg={BADGE_COLORS[i][0]} color={BADGE_COLORS[i][1]}>{b}</Chip>
              ))}
            </div>
          </Reveal>
        </section>

        {/* 4 · Marquee */}
        <section aria-label="Product highlights" className="hairline border-y py-5">
          <div className="marquee">
            <div className="marquee-track">
              {[0, 1].map((copy) => (
                <ul key={copy} aria-hidden={copy === 1} className="flex shrink-0 items-center">
                  {c.marquee.map((tag) => (
                    <li key={tag} className="flex items-center gap-5 pr-5 text-[14px] font-semibold text-[#0B1A30]">
                      <span>{tag}</span>
                      <span className="text-[#0a7c53]" aria-hidden="true">●</span>
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </div>
        </section>

        {/* 5 · Problem */}
        <section id="problem" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-24 lg:py-32">
          <Reveal>
            <Chip>{c.problem.chip}</Chip>
            <div className="mt-5 max-w-2xl"><Display><Em v={c.problem.title} /></Display></div>
            <p className="mt-6 max-w-xl text-[18px] leading-relaxed text-[#5A6B82]">{c.problem.sub}</p>
          </Reveal>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {c.problem.statLabels.map(([label, sub], i) => {
              const [value, bg, ink] = PROBLEM_VIS[i];
              return (
                <Reveal key={label} delay={i * 80}>
                  <div className="h-full rounded-3xl p-7" style={{ backgroundColor: bg }}>
                    <p className="f-display text-[clamp(2.4rem,4vw,3.25rem)] font-bold leading-none" style={{ color: ink }}>{value}</p>
                    <p className="mt-4 text-[15px] font-bold" style={{ color: ink }}>{label}</p>
                    <p className="mt-1.5 text-[13.5px] leading-relaxed" style={{ color: ink, opacity: 0.75 }}>{sub}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </section>

        {/* 6 · How it works */}
        <section id="how" className="scroll-mt-20 bg-[#C8EFD8]">
          <div className="mx-auto max-w-6xl px-5 py-24 lg:py-32">
            <Reveal>
              <Chip bg="#0C6B49" color="#C8EFD8">{c.how.chip}</Chip>
              <div className="mt-5 max-w-2xl"><Display color="#0B3D2C"><Em v={c.how.title} accent="#0C6B49" /></Display></div>
            </Reveal>
            <ol className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {c.how.steps.map((step, i) => (
                <Reveal key={i} delay={i * 90}>
                  <li className="h-full rounded-3xl bg-[#f7f9fb] p-7">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-[#0a7c53] text-[15px] font-bold text-white">{i + 1}</span>
                      <LineIcon path={STEP_ICONS[i]} color="#0C6B49" />
                    </div>
                    <h3 className="f-display mt-5 text-[17px] font-bold text-[#0B1A30]">{step.title}</h3>
                    <p className="mt-2 text-[14px] leading-relaxed text-[#5A6B82]">{step.body}</p>
                  </li>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* 7 · Features */}
        <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-24 lg:py-32">
          <Reveal>
            <Chip>{c.features.chip}</Chip>
            <div className="mt-5 max-w-2xl"><Display><Em v={c.features.title} /></Display></div>
          </Reveal>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {c.features.items.map((feature, i) => {
              const vis = FEATURE_VIS[i];
              return (
                <Reveal key={feature.title} delay={(i % 3) * 80}>
                  <article className="lift hairline relative h-full rounded-3xl border p-7" style={{ backgroundColor: vis.bg }}>
                    <span className="chip" style={{ backgroundColor: "rgba(11,26,48,0.08)", color: vis.ink }}>{feature.tag}</span>
                    <div className="mt-6"><LineIcon path={vis.icon} color={vis.ink} /></div>
                    <h3 className="f-display mt-4 text-[19px] font-bold" style={{ color: vis.ink }}>{feature.title}</h3>
                    <p className="mt-2 text-[14.5px] leading-relaxed" style={{ color: vis.ink, opacity: 0.82 }}>{feature.body}</p>
                  </article>
                </Reveal>
              );
            })}
          </div>
        </section>

        {/* 8 · Opportunity + investor form */}
        <section id="investors" className="scroll-mt-20 bg-[#0B1A30]">
          <div className="mx-auto max-w-6xl px-5 py-24 lg:py-32">
            <Reveal><Chip bg="#0a7c53" color="#f7f9fb">{c.opportunity.chip}</Chip></Reveal>
            <div className="mt-12 grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
              {c.opportunity.metricLabels.map((label, i) => (
                <Reveal key={label} delay={i * 80}>
                  <div>
                    <p className="f-display text-[clamp(3rem,6vw,4.5rem)] font-bold leading-none text-[#0a7c53]">{METRIC_VALUES[i]}</p>
                    <p className="mt-4 text-[13px] font-medium uppercase tracking-wide text-[#9DB0CC]">{label}</p>
                  </div>
                </Reveal>
              ))}
            </div>
            <Reveal delay={200}>
              <p className="mt-12 text-[12px] font-medium uppercase tracking-wide text-[#5D6B84]">{c.opportunity.note}</p>
            </Reveal>

            <div className="mt-16 grid items-start gap-10 border-t border-white/10 pt-16 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
              <Reveal>
                <Display size="md" color="#f7f9fb"><Em v={c.opportunity.title} /></Display>
                <p className="mt-5 max-w-md text-[16px] leading-relaxed text-[#9DB0CC]">{c.opportunity.sub}</p>
              </Reveal>
              <Reveal delay={120}><InvestorForm t={c.form} /></Reveal>
            </div>
          </div>
        </section>

        {/* 9 · Pull quote */}
        <section className="bg-[#FFE4AC]">
          <div className="mx-auto max-w-4xl px-5 py-24 text-center lg:py-28">
            <Reveal>
              <blockquote className="f-display text-[clamp(1.8rem,4vw,2.9rem)] font-bold leading-[1.15] tracking-[-0.02em] text-[#7C5310] [text-wrap:balance]">
                {c.quote.a}<span className="text-[#065f3e]">{c.quote.em}</span>{c.quote.b}
              </blockquote>
            </Reveal>
          </div>
        </section>

        {/* 10 · CTA */}
        <section id="cta" className="scroll-mt-20 bg-[#0a7c53]">
          <div className="mx-auto max-w-6xl px-5 py-24 lg:py-28">
            <Reveal>
              <div className="mx-auto max-w-2xl text-center">
                <Display color="#f7f9fb"><Em v={c.cta.title} accent="#0B1A30" /></Display>
                <p className="mx-auto mt-5 max-w-md text-[18px] leading-relaxed text-[#d1fae5]">{c.cta.sub}</p>
                <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                  <a href={href("/register")} className="btn btn-navy px-7 py-3.5 text-[15px]">{c.cta.join}</a>
                  <a href="#investors" className="btn btn-light px-7 py-3.5 text-[15px]">{c.cta.investors}</a>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      {/* 11 · Footer */}
      <footer className="bg-[#0B1A30]">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Wordmark tone="light" />
            <p className="mt-4 max-w-[16rem] text-[14px] leading-relaxed text-[#9DB0CC]">{c.footer.tagline}</p>
          </div>
          {c.footer.groups.map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <h3 className="text-[12px] font-bold uppercase tracking-wide text-[#5D6B84]">{group.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {group.links.map(([label, link]) => (
                  <li key={label}>
                    <a href={href(link)} className="text-[14px] text-[#9DB0CC] transition-colors hover:text-[#f7f9fb]">{label}</a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="border-t border-white/10">
          <p className="mx-auto max-w-6xl px-5 py-6 text-[12px] font-medium uppercase tracking-wide text-[#5D6B84]">{c.footer.copyright}</p>
        </div>
      </footer>
    </div>
  );
}
