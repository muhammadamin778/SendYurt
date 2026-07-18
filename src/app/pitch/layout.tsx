import type { Metadata } from "next";
import { Space_Grotesk, Hanken_Grotesk } from "next/font/google";
import "../globals.css";
import "./pitch.css";

// Monzo-inspired typographic identity, tuned for SendYurt: a friendly
// grotesk display (Space Grotesk — the quirky-but-confident headline voice,
// standing in for Oldschool Grotesk) over a clean humanist grotesk for UI
// and body (Hanken Grotesk, our open stand-in for Monzo Sans).
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-pitch-display",
  display: "swap",
});

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-pitch-sans",
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
      className={`${spaceGrotesk.variable} ${hanken.variable} scroll-smooth`}
    >
      <body className="pitch f-sans bg-[#f7f9fb] text-[#0F1B2D] antialiased">
        {children}
      </body>
    </html>
  );
}
