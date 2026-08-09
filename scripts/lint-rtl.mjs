/**
 * RTL contract enforcement (MASTER_PROMPT §4.3 Rule 1).
 *
 * Physical-direction utilities silently break the Arabic layout, and they are
 * impossible to catch in review because they look correct in English. A lint
 * rule is the only thing that actually keeps a bilingual layout honest.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative, extname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCAN = [join(ROOT, "apps", "web", "app"), join(ROOT, "apps", "web", "components")];

/** [forbidden pattern, required replacement] */
const RULES = [
  [/\b(?:sm:|md:|lg:|xl:|2xl:|hover:|focus:)?(m[lr])-(?![a-z])/g, "ms-* / me-*"],
  [/\b(?:sm:|md:|lg:|xl:|2xl:|hover:|focus:)?(p[lr])-(?![a-z])/g, "ps-* / pe-*"],
  [/\btext-(left|right)\b/g, "text-start / text-end"],
  [/\bborder-(l|r)-/g, "border-s-* / border-e-*"],
  [/\brounded-(l|r)-/g, "rounded-s-* / rounded-e-*"],
  [/\bfloat-(left|right)\b/g, "logical float or flex"],
];

// `left-`/`right-` are only wrong as position utilities; allow them in
// arbitrary values and CSS-in-JS where they may be legitimate.
const POSITION = /\b(?:absolute|fixed|sticky)\b[\s\S]{0,80}?\b(left|right)-\d/g;

const findings = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      walk(path);
      continue;
    }
    if (![".ts", ".tsx"].includes(extname(path))) continue;

    const file = relative(ROOT, path).replaceAll("\\", "/");
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .forEach((line, i) => {
        // Only inspect className strings — prose and comments are not layout.
        if (!/class(Name)?\s*=|clsx\(|cn\(/.test(line)) return;
        for (const [pattern, replacement] of RULES) {
          pattern.lastIndex = 0;
          const match = pattern.exec(line);
          if (match) {
            findings.push(`${file}:${i + 1}  "${match[0]}" → use ${replacement}`);
          }
        }
        POSITION.lastIndex = 0;
        if (POSITION.test(line)) {
          findings.push(`${file}:${i + 1}  physical left-/right- position → use start-* / end-*`);
        }
      });
  }
}

for (const dir of SCAN) walk(dir);

console.log(`rtl lint — scanned ${SCAN.length} trees\n`);
if (findings.length) {
  console.log(`errors (${findings.length}):`);
  for (const f of findings) console.log(`  ${f}`);
  process.exit(1);
}
console.log("no physical-direction utilities found");
