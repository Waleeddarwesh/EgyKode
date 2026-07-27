import { IBM_Plex_Sans_Arabic, Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";

/**
 * Self-hosted by next/font — zero external requests, no layout shift, no
 * third-party exposure (§3.3).
 *
 * These live here rather than in the root layout because the `<html>` element
 * is rendered by the locale layout (it owns `lang` and `dir`), and that is
 * where the font variables must be applied.
 */
const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-display",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-mono",
  display: "swap",
});

const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-arabic",
  display: "swap",
});

export const fontVariables = [
  inter.variable,
  spaceGrotesk.variable,
  jetbrains.variable,
  plexArabic.variable,
].join(" ");
