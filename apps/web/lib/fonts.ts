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
  // `--font-mono` otherwise expands to `jetbrains, "jetbrains Fallback"`, and
  // that auto-generated fallback family covers every codepoint — including the
  // box-drawing glyphs this file lacks. It therefore answered for them at
  // system-font widths before the scoped drawing face below was ever consulted,
  // and the drawing woff2 was never even fetched. Turning it off lets the
  // per-character fallback reach the right face.
  adjustFontFallback: false,
});

/**
 * The box-drawing and arrow glyphs the ASCII diagrams are made of.
 *
 * The main file is Google's latin subset, which does not contain U+2500–U+259F.
 * The browser therefore fell back to whatever system font had them, where a
 * `─` measures 12.67px against 8.16px for a latin character — 55% wider. Every
 * diagram built from box characters lost its column alignment and overflowed
 * its container, across 22 content files.
 *
 * This is the same typeface, subset to exactly the sixteen glyphs the content
 * uses (1.3KB), scoped by `unicode-range` so it is fetched only when a page
 * actually draws a diagram. `next/font/local` hashes and serves it like any
 * other face; the `unicode-range` descriptor is what makes the browser reach
 * for it per character rather than per element.
 */
const jetbrainsDrawing = localFont({
  src: [{ path: "../app/fonts/jetbrains-mono-drawing.woff2", weight: "400 700", style: "normal" }],
  variable: "--font-mono-drawing",
  display: "swap",
  // One string literal, not a concatenation: `next/font` reads this config
  // statically at build time and cannot evaluate an expression, which fails
  // the build with a parse error rather than a helpful message.
  declarations: [
    {
      prop: "unicode-range",
      value: "U+2190, U+2192-2193, U+2500, U+2502, U+250c, U+2510, U+2514, U+2518, U+251c, U+2524, U+252c, U+2534, U+253c, U+2550, U+25b6",
    },
  ],
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
  jetbrainsDrawing.variable,
  plexArabic.variable,
].join(" ");
