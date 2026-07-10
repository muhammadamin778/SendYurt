import type { Metadata } from "next";
import { Lora, Manrope } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Providers } from "@/components/Providers";
import { Toaster } from "@/components/ui/Toaster";
import "../globals.css";

// Type pairing: Manrope (a warm, confident sans) carries the UI; Lora (a
// calligraphy-rooted serif) gives headings craft character. Both ship full
// Cyrillic subsets, so Uzbek Latin and Uzbek/Russian Cyrillic render from
// the same faces.
const manrope = Manrope({
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  variable: "--font-body",
  display: "swap",
});

const lora = Lora({
  subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "SendYurt",
    template: "%s · SendYurt",
  },
  description:
    "Send money home smarter. Compare remittance routes, budget together as a family, and build financial credibility.",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!routing.locales.includes(locale as never)) {
    notFound();
  }
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    // suppressHydrationWarning: the pre-paint theme script may add .dark
    // before React hydrates the html element.
    <html
      lang={locale}
      className={`${manrope.variable} ${lora.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Applies the stored (or system) theme before first paint so
            there is no light-flash for dark-mode users. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('sy-theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}",
          }}
        />
      </head>
      <body className="min-h-screen">
        <NextIntlClientProvider messages={messages}>
          <Providers>
            {children}
            <Toaster />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
