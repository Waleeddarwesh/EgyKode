#!/usr/bin/env node
/**
 * Build the contents of the standalone Killercoda scenarios repository.
 *
 *   node scripts/sync-scenarios.mjs <target-dir>            show what would change
 *   node scripts/sync-scenarios.mjs <target-dir> --write    write it
 *   node scripts/sync-scenarios.mjs <target-dir> --check    exit 1 if out of date
 *
 * Killercoda scans a repository's root for directories containing index.json.
 * These live under `killercoda/` in the main repository, and two attempts at
 * connecting it synced the right commit and published nothing — once with no
 * structure.json, once with one. Both times the sync reported success and
 * found zero scenarios, with no error to read.
 *
 * A repository whose root *is* the scenarios removes the question entirely,
 * which is how most of Killercoda's own examples are laid out. The sources
 * stay in `killercoda/`; this generates the mirror, and `--check` fails CI
 * when the two drift. A hand-maintained copy would diverge, and the copy
 * nobody edits is the one learners actually run.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "killercoda");

const args = process.argv.slice(2);
const WRITE = args.includes("--write");
const CHECK = args.includes("--check");
const target = args.find((a) => !a.startsWith("--"));

if (!target) {
  console.log("Usage: node scripts/sync-scenarios.mjs <target-dir> [--write|--check]");
  process.exit(1);
}

const scenarios = readdirSync(SRC)
  .filter((f) => statSync(join(SRC, f)).isDirectory())
  .filter((f) => existsSync(join(SRC, f, "index.json")))
  .sort();

const planned = new Map();
for (const name of scenarios) {
  for (const file of readdirSync(join(SRC, name))) {
    // Scenario directories are flat: index.json, *.md, *.sh. Anything nested
    // would need copying recursively, and nothing here is.
    if (statSync(join(SRC, name, file)).isDirectory()) continue;
    planned.set(`${name}/${file}`, readFileSync(join(SRC, name, file)));
  }
}

const titles = scenarios.map((n) => {
  const j = JSON.parse(readFileSync(join(SRC, n, "index.json"), "utf8"));
  return `| \`${n}\` | ${j.title} | ${j.backend?.imageid ?? "?"} |`;
});

const README = `# EgyKode Killercoda scenarios

Hands-on scenarios for [EgyKode](https://egykode.com), free and in the browser
with nothing to install.

| Directory | Scenario | Backend |
| --- | --- | --- |
${titles.join("\n")}

Each is three steps with a verification script per step, a setup script that
builds the starting state, and a finish page.

## Why this repository exists

Killercoda scans a repository's **root** for directories containing
\`index.json\`. In the main EgyKode repository these live under
\`killercoda/\`, and connecting it synced correctly and published nothing —
twice, silently. A repository whose root is the scenarios has no such
ambiguity.

## This repository is generated

The sources live in [the main EgyKode repository](https://github.com/Waleeddarwesh/EgyKode)
under \`killercoda/\`. Edit them there; \`scripts/sync-scenarios.mjs\`
regenerates this mirror and CI fails when the two drift. Changes made directly
here are lost on the next sync.
`;

planned.set("README.md", Buffer.from(README, "utf8"));

let changed = 0;
for (const [rel, content] of planned) {
  const dest = join(target, rel);
  const current = existsSync(dest) ? readFileSync(dest) : null;
  if (current && current.equals(content)) continue;
  changed += 1;
  console.log(`  ${current ? "update" : "add   "}  ${rel}`);
  if (WRITE) {
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, content);
  }
}

// A scenario renamed upstream leaves its old directory behind, and Killercoda
// would keep publishing it.
if (existsSync(target)) {
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      if (entry === ".git") continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else {
        const rel = relative(target, full).split("\\").join("/");
        if (!planned.has(rel)) {
          changed += 1;
          console.log(`  STALE   ${rel} — no longer produced; delete it`);
        }
      }
    }
  };
  walk(target);
}

console.log("");
if (changed === 0) {
  console.log(`${target} is in sync (${scenarios.length} scenarios, ${planned.size} files).`);
} else {
  console.log(`${changed} file(s) differ.`);
  if (CHECK) {
    console.log("Run: node scripts/sync-scenarios.mjs <target> --write");
    process.exitCode = 1;
  } else if (!WRITE) {
    console.log("Pass --write to apply.");
  }
}
