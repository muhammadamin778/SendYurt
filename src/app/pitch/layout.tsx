import type { Metadata } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import "../globals.css";
import "./pitch.css";

// The pitch site has its own typographic identity: Fraunces (a modern
// serif with true italics — the headline emphasis move), Inter for body,
// JetBrains Mono for eyebrows and figures.
const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-pitch-serif",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-pitch-sans",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-pitch-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SendYurt — Send money home smarter",
  description:
    "The money co-pilot for Uzbek labor migrants and their families: the cheapest, safest route home, a Trust Score for every provider, and one shared family budget.",
};

export default function PitchLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} ${jetbrains.variable} scroll-smooth`}
    >
      <body className="pitch f-sans bg-[#0B1220] text-[#9DA9BE] antialiased">
        {children}
      </body>
    </html>
  );
}
