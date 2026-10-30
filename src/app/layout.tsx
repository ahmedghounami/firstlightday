import type { Metadata, Viewport } from "next";
import { Bodoni_Moda, El_Messiri, IBM_Plex_Mono, Newsreader } from "next/font/google";
import { RevealProvider } from "@/components/Reveal";
import { Footer } from "@/components/Footer";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const bodoni = Bodoni_Moda({ subsets: ["latin"], variable: "--font-bodoni", axes: ["opsz"], style: ["normal", "italic"], display: "swap" });
const newsreader = Newsreader({ subsets: ["latin"], variable: "--font-newsreader", axes: ["opsz"], style: ["normal", "italic"], display: "swap" });
const plex = IBM_Plex_Mono({ subsets: ["latin"], variable: "--font-plex-mono", weight: ["400", "500"], display: "swap" });

const messiri = El_Messiri({ subsets: ["arabic"], variable: "--font-messiri", weight: ["500", "700"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Firstlight — the day you arrived", template: "%s · Firstlight" },
  description: "Enter your birthday and open the record of that exact day: the headlines, releases, matches and discoveries we can trace to it.",
  openGraph: { siteName: "Firstlight", type: "website" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = { themeColor: "#0d0c16" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bodoni.variable} ${newsreader.variable} ${plex.variable} ${messiri.variable}`}>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 btn">
          Skip to content
        </a>
        <RevealProvider>{children}</RevealProvider>
              </body>
    </html>
  );
}
