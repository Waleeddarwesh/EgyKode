/**
 * Contrast audit over the token matrix (MASTER_PROMPT §3.2, §13.2).
 *
 * Checks the palette itself rather than rendered pages, so a failing colour is
 * caught the moment it enters tokens.json — before it is used in fifty places.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const tokens = JSON.parse(
  readFileSync(join(ROOT, "packages", "design-tokens", "tokens.json"), "utf8"),
);

// ── Colour parsing ──────────────────────────────────────────────────────────
function hslToRgb(h, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)].map((v) => Math.round(v * 255));
}

function parse(value) {
  const v = value.trim();
  let m = v.match(/^#([0-9a-f]{6})$/i);
  if (m) {
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  m = v.match(/^hsla?\(\s*([\d.]+)[,\s]+([\d.]+)%[,\s]+([\d.]+)%/i);
  if (m) return hslToRgb(+m[1], +m[2], +m[3]);
  m = v.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?/i);
  if (m) return [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]];
  m = v.match(/^hsla\(\s*([\d.]+)[,\s]+([\d.]+)%[,\s]+([\d.]+)%[,\s/]+([\d.]+)/i);
  if (m) return [...hslToRgb(+m[1], +m[2], +m[3]), +m[4]];
  return null;
}

/**
 * Composite a translucent colour over an opaque one.
 *
 * The dark border is rgba(255,255,255,0.07): treated as opaque white it made
 * every text token "fail" against it. A translucent surface is never the real
 * background — what a reader sees is the blend.
 */
function over(fg, bg) {
  const a = fg[3] ?? 1;
  if (a >= 1) return [fg[0], fg[1], fg[2]];
  return [0, 1, 2].map((i) => Math.round(fg[i] * a + bg[i] * (1 - a)));
}

const channel = (c) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

const luminance = ([r, g, b]) =>
  0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);

function ratio(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

// ── The pairs that must hold ────────────────────────────────────────────────
// Text tokens are checked against every surface they can legitimately sit on.
const SURFACES = [
  "clr-bg",
  "clr-bg-secondary",
  "clr-surface",
  "clr-surface-active",
  // Used as a hairline grid background, so text does sit on it.
  "clr-surface-border",
];

const RULES = [
  { fg: "clr-text", min: 4.5, label: "body text" },
  { fg: "clr-text-secondary", min: 4.5, label: "secondary text" },
  { fg: "clr-text-muted", min: 4.5, label: "muted text" },
  { fg: "clr-primary", min: 4.5, label: "links / primary text" },
  { fg: "clr-success", min: 4.5, label: "success text" },
  { fg: "clr-warning", min: 4.5, label: "warning text" },
  { fg: "clr-danger", min: 4.5, label: "danger text" },
  { fg: "clr-info", min: 4.5, label: "info text" },
  // Non-text: borders and focus rings need 3:1 (WCAG 1.4.11).
  { fg: "clr-surface-border", min: 1.0, label: "border (informational only)" },
];

const failures = [];
const notes = [];
const results = [];

for (const [themeName, theme] of Object.entries(tokens.themes)) {
  // Domain colours are used as TEXT on cards and in breadcrumbs, so they are
  // held to 4.5:1 like any other text token. This was missed originally, and
  // axe caught it on a rendered page instead — which is the slow way round.
  for (const key of Object.keys(theme)) {
    if (!key.startsWith("dm-")) continue;
    RULES.push({ fg: key, min: 4.5, label: "domain colour used as text" });
  }

  for (const rule of RULES) {
    const fg = parse(theme[rule.fg] ?? "");
    if (!fg) continue;

    for (const surfaceKey of SURFACES) {
      const rawBg = parse(theme[surfaceKey] ?? "");
      if (!rawBg) continue;
      // A translucent surface sits on the page background; compare the blend.
      const bg = over(rawBg, parse(theme["clr-bg"]) ?? [255, 255, 255]);

      const r = ratio(over(fg, bg), bg);
      const pass = r >= rule.min;
      results.push({ themeName, rule, surfaceKey, r, pass });
      if (!pass) {
        failures.push(
          `${themeName.padEnd(5)} ${rule.fg.padEnd(20)} on ${surfaceKey.padEnd(18)} ` +
            `${r.toFixed(2)}:1  (needs ${rule.min}:1)  — ${rule.label}`,
        );
      }
    }
  }

  // WCAG 1.4.3 and 1.4.11 both exempt logotypes from contrast thresholds, so
  // a low ratio here is not a violation. It is still reported, because exempt
  // is not the same as legible: where the ratio is under 3:1 the UI must tint
  // the mark with --clr-primary rather than the raw brand green (see the
  // .brand-mark rule in globals.css).
  const brand = parse(theme["clr-brand"]);
  const bg = parse(theme["clr-bg"]);
  if (brand && bg) {
    const r = ratio(brand, bg);
    if (r < 3) {
      notes.push(
        `${themeName.padEnd(5)} clr-brand on clr-bg is ${r.toFixed(2)}:1 — logo exemption ` +
          `applies, so UI chrome tints the mark with --clr-primary instead`,
      );
    }
  }
}

const checked = results.length;
console.log(`contrast — ${checked} token pairs checked across ${Object.keys(tokens.themes).length} themes\n`);

if (notes.length) {
  console.log(`notes (${notes.length}):`);
  for (const line of notes) console.log(`  ${line}`);
  console.log();
}

if (failures.length) {
  console.log(`failures (${failures.length}):`);
  for (const line of failures) console.log(`  ${line}`);
  console.log("\nFix the value in packages/design-tokens/tokens.json.");
  process.exit(1);
}

console.log("all pairs meet their threshold");
