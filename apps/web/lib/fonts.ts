import localFont from "next/font/local";

/**
 * Self-hosted from files in the repository, not fetched at build time.
 *
 * `next/font/google` downloads every family from fonts.gstatic.com while
 * building. That is one network dependency per family on the critical path of
 * every release, and it failed a deploy: three retries inside next/font, all
 * timing out, on a commit with nothing wrong with it. A retry around the build
 * made that survivable; holding the files removes the dependency.
 *
 * Only the subsets actually used are here — latin for the three Latin
 * families, arabic for Plex — which is 265KB of woff2 rather than the ~2MB the
 * full set of subsets would be. Each face is still served from our own origin
 * with no external request, exactly as `next/font/google` arranged, so nothing
 * about the runtime behaviour or the privacy story changes.
 *
 * These live here rather than in the root layout because the `<html>` element
 * is rendered by the locale layout (it owns `lang` and `dir`), and that is
 * where the font variables must be applied.
 *
 * See app/fonts/NOTICE.md for the families, their sources and their licence.
 */

const inter = localFont({
  // A variable font: one file covers the whole weight range, which is why
  // there is no per-weight list here.
  src: [{ path: "../app/fonts/inter-100-900.woff2", weight: "100 900", style: "normal" }],
  variable: "--font-sans",
  display: "swap",
});

const spaceGrotesk = localFont({
  // One variable file, declared as a range. Google serves the same bytes for
  // every weight you ask this family for — the 500 and 700 downloads were
  // byte-identical — so listing them as two static faces would hand the
  // browser one variable font pinned at a fixed weight and lose real bold.
  src: [{ path: "../app/fonts/space-grotesk-500-700.woff2", weight: "500 700", style: "normal" }],
  variable: "--font-display",
  display: "swap",
});

const jetbrains = localFont({
  // Variable too: 400, 500 and 700 all downloaded as the same file.
  src: [{ path: "../app/fonts/jetbrains-mono-400-700.woff2", weight: "400 700", style: "normal" }],
  variable: "--font-mono",
  display: "swap",
});

// Plex genuinely ships four distinct faces — their checksums differ — so these
// stay listed individually.
const plexArabic = localFont({
  src: [
    { path: "../app/fonts/plex-arabic-400.woff2", weight: "400", style: "normal" },
    { path: "../app/fonts/plex-arabic-500.woff2", weight: "500", style: "normal" },
    { path: "../app/fonts/plex-arabic-600.woff2", weight: "600", style: "normal" },
    { path: "../app/fonts/plex-arabic-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-arabic",
  display: "swap",
});

export const fontVariables = [
  inter.variable,
  spaceGrotesk.variable,
  jetbrains.variable,
  plexArabic.variable,
].join(" ");
