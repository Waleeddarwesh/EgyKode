/**
 * Generates apps/web/styles/tokens.css from tokens.json.
 *
 * The token file is the single source of truth (MASTER_PROMPT §3.2). Nothing
 * else in the codebase may hardcode a brand colour — Tailwind reads these via
 * var(), so a change here propagates everywhere with no find-and-replace.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const tokens = JSON.parse(readFileSync(join(here, "tokens.json"), "utf8"));

const vars = (obj, indent = "  ") =>
  Object.entries(obj)
    .map(([k, v]) => `${indent}--${k}: ${v};`)
    .join("\n");

const css = `/* GENERATED FILE — edit packages/design-tokens/tokens.json instead. */

:root,
[data-theme="dark"] {
${vars(tokens.themes.dark)}

${vars(tokens.radius, "  --radius-")}
${vars(tokens.motion)}
${vars(tokens.gradient)}
}

[data-theme="light"] {
${vars(tokens.themes.light)}
}

/* Tell the browser which UI scheme to paint, so it does not render a white
   scrollbar or a light <select> popup over the dark theme. */
:root,
[data-theme="dark"] { color-scheme: dark; }
[data-theme="light"] { color-scheme: light; }
`;

const out = join(root, "apps", "web", "styles", "tokens.css");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, css, "utf8");

const count =
  Object.keys(tokens.themes.dark).length + Object.keys(tokens.themes.light).length;
console.log(`design-tokens: wrote ${count} custom properties → apps/web/styles/tokens.css`);
