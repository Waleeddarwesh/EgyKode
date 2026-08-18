#!/usr/bin/env node
/**
 * Turn published Killercoda scenarios on, once they are actually published.
 *
 *   node scripts/enable-killercoda.mjs <profile>            show what it would write
 *   node scripts/enable-killercoda.mjs <profile> --write    write it
 *
 * `<profile>` is the Killercoda creator profile the scenarios were published
 * under — the segment in https://killercoda.com/<profile>/scenario/<name>.
 *
 * ── Why this asks you to check the URLs yourself ──────────────────────────
 *
 * An earlier version of this script requested each URL and enabled the ones
 * that returned 200. That check was worthless, and worse than none: it
 * reported success for a profile that did not exist.
 *
 * Killercoda serves the same 5062-byte application shell for every path —
 * a real scenario and a nonsense one are byte-identical over HTTP. Rendering
 * the page in a headless browser does not help either: both stop at a
 * reCAPTCHA consent gate and produce the same 650 characters, so the scenario
 * content never loads for anything automated.
 *
 * There is therefore no check this repository can run that distinguishes a
 * published scenario from a typo. A human with a browser is the only verifier,
 * so this script writes what you confirm rather than guessing and calling it
 * verified — the same rule that keeps `enabled: false` on every scenario until
 * its URL is known to work.
 */
import { readFileSync, readdirSync, writeFileSync, existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = join(ROOT, "killercoda");

const args = process.argv.slice(2);
const WRITE = args.includes("--write");

/**
 * Explicit URLs beat a guessed one.
 *
 * The URL is built as /<profile>/scenario/<directory>, which is right when a
 * scenario sits at the repository root. These live under `killercoda/`, and
 * Killercoda's own examples include a nested scenario — so the published path
 * may carry the parent segment too. Rather than guess and be confidently
 * wrong, `--url name=<url>` takes what you actually see in the browser.
 */
const explicit = new Map();
const positional = [];
for (let i = 0; i < args.length; i += 1) {
  const a = args[i];
  // Both spellings, because `--url a=b` reaches the process as two arguments
  // and the value then looked like a positional profile. It did: the first run
  // built https://killercoda.com/<the-whole-url>/scenario/… for every scenario.
  const inline = a.match(/^--url=(.+?)=(https:\/\/.+)$/);
  if (inline) {
    explicit.set(inline[1], inline[2]);
    continue;
  }
  if (a === "--url") {
    const pair = args[i + 1] ?? "";
    const m = pair.match(/^(.+?)=(https:\/\/.+)$/);
    if (!m) {
      console.log(`--url needs <scenario>=<https url>, got: ${pair || "(nothing)"}`);
      process.exit(1);
    }
    explicit.set(m[1], m[2]);
    i += 1;
    continue;
  }
  if (!a.startsWith("--")) positional.push(a);
}

const profile = positional[0];
if (!profile && explicit.size === 0) {
  console.log("Usage:");
  console.log("  node scripts/enable-killercoda.mjs <profile> [--write]");
  console.log("  node scripts/enable-killercoda.mjs --url <scenario>=<full-url> ... --write");
  console.log("");
  console.log("The profile form builds /<profile>/scenario/<directory>. If the");
  console.log("published path differs, paste the real URL with --url instead:");
  console.log("  --url k8s-workloads=https://killercoda.com/you/scenario/killercoda/k8s-workloads");
  process.exit(1);
}

const scenarios = readdirSync(DIR)
  .filter((f) => statSync(join(DIR, f)).isDirectory())
  .filter((f) => existsSync(join(DIR, f, "index.json")));

const planned = [];
const problems = [];

for (const name of scenarios) {
  const json = JSON.parse(readFileSync(join(DIR, name, "index.json"), "utf8"));
  const labId = json.labId;
  const url = explicit.get(name) ?? `https://killercoda.com/${profile}/scenario/${name}`;
  const file = join(ROOT, "content", "labs", `${labId}.en.mdx`);

  if (!labId || !existsSync(file)) {
    problems.push(`${name}: labId "${labId}" matches no lab`);
    continue;
  }

  const raw = readFileSync(file, "utf8");
  const nl = raw.includes("\r\n") ? "\r\n" : "\n";
  const lines = raw.split(nl);

  const at = lines.findIndex((l) => /^ {2}online:\s*$/.test(l));
  if (at === -1) {
    problems.push(`${name}: ${labId} has no handsOn.online block`);
    continue;
  }

  // Replace the block wholesale rather than patching lines. The block is three
  // keys, and a partial edit that sets `enabled` without a `url` is precisely
  // the state content lint rejects.
  let end = at + 1;
  while (end < lines.length && /^ {4}\S/.test(lines[end])) end += 1;
  lines.splice(at, end - at, "  online:", "    platform: killercoda", "    enabled: true", `    url: "${url}"`);

  planned.push({ name, labId, url, file, body: lines.join(nl) });
}

console.log("");
if (!WRITE) {
  console.log("Open each of these in a browser and confirm it loads the scenario.");
  console.log("Nothing here can check them for you — see the comment at the top of");
  console.log("this file for why. Then re-run with --write.\n");
}

for (const p of planned) {
  console.log(`  ${p.url}`);
  console.log(`      -> ${p.labId}`);
  if (WRITE) writeFileSync(p.file, p.body);
}

if (problems.length) {
  console.log("\n  PROBLEMS");
  for (const p of problems) console.log(`    ${p}`);
}

console.log("");
console.log(
  WRITE
    ? `${planned.length} scenario(s) enabled. Run \`npm run content:lint\` to confirm.`
    : `${planned.length} scenario(s) ready. Re-run with --write once you have opened them.`,
);
process.exitCode = problems.length ? 1 : 0;
