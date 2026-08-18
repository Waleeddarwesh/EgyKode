#!/usr/bin/env node
/**
 * Build the contents of the standalone lab-environment repository.
 *
 *   node scripts/sync-lab-env.mjs <target-dir>            show what would change
 *   node scripts/sync-lab-env.mjs <target-dir> --write    write it
 *   node scripts/sync-lab-env.mjs <target-dir> --check    exit 1 if out of date
 *
 * The environment is 97K of a 6.4M repository, and the rest of that repository
 * is a website. Asking a learner to clone all of it to run `./egykode start`
 * downloads seventy times what they need and invites the reasonable question of
 * why a Linux lab requires the source of a Next.js site.
 *
 * So the environment is mirrored into its own repository. This script is what
 * makes that safe: the files here remain the originals, the mirror is
 * generated, and `--check` fails CI when the two drift. A hand-maintained copy
 * would diverge, and the copy nobody edits is the one learners actually run.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const WRITE = args.includes("--write");
const CHECK = args.includes("--check");
const target = args.find((a) => !a.startsWith("--"));

if (!target) {
  console.log("Usage: node scripts/sync-lab-env.mjs <target-dir> [--write|--check]");
  process.exit(1);
}

/** Everything the environment needs, and nothing else. */
const FILES = [
  "egykode",
  "egykode.cmd",
  "docker-compose.yml",
  "docker/all/Dockerfile",
  "docker/managed-node/Dockerfile",
  "clusters/kind-default.yaml",
  "clusters/kind-calico.yaml",
  "scripts/doctor.mjs",
  // Without this a learner never pulls the published images — compose falls
  // back to a namespace that does not exist and builds from source instead.
  ".env.example",
];

/**
 * Lab requirements, extracted.
 *
 * `doctor <labId>` reads a lab's frontmatter to know what that lab needs, and
 * the mirror has no content/ directory to read. Rather than degrade to a
 * generic report — which is the answer to a question the learner did not ask —
 * the requirements are extracted here into one small file that doctor falls
 * back to.
 */
function labRequirements() {
  const dir = join(ROOT, "content", "labs");
  const out = {};
  if (!existsSync(dir)) return out;

  for (const file of readdirSync(dir).filter((f) => f.endsWith(".en.mdx"))) {
    const fm = readFileSync(join(dir, file), "utf8").match(/^---([\s\S]*?)\r?\n---/)?.[1];
    if (!fm) continue;
    const lines = fm.split(/\r?\n/);

    const localAt = lines.findIndex((l) => /^ {2}local:\s*$/.test(l));
    if (localAt === -1) continue;
    const block = [];
    for (const line of lines.slice(localAt + 1)) {
      if (line.trim() && !line.startsWith("    ")) break;
      block.push(line);
    }

    const list = (key) => {
      const at = block.findIndex((l) => new RegExp(`^ {4}${key}:\\s*$`).test(l));
      if (at === -1) return [];
      const items = [];
      for (const line of block.slice(at + 1)) {
        const m = line.match(/^ {6}-\s+(.+?)\s*$/);
        if (!m) break;
        items.push(m[1]);
      }
      return items;
    };

    out[file.replace(".en.mdx", "")] = {
      title: (fm.match(/^title:\s*["']?(.*?)["']?\s*$/m)?.[1] ?? "").trim(),
      environment: block.find((l) => /^ {4}environment:/.test(l))?.split(":")[1]?.trim(),
      tools: list("tools"),
      capabilities: list("capabilities"),
    };
  }
  return out;
}

const README = `# EgyKode lab environment

The machines the [EgyKode](https://egykode.com) labs run on: a controller you
work from, and a managed node for it to configure.

\`\`\`bash
./egykode start          # controller + node
./egykode start k8s      # ...and a three-node Kubernetes cluster
./egykode shell          # a prompt inside the controller
./egykode doctor <lab>   # what a given lab needs, and what is missing
./egykode stop           # stop, keeping your work
\`\`\`

On Windows use the same commands — \`egykode.cmd\` makes \`./egykode\` work in
PowerShell and CMD. You need [Docker](https://docs.docker.com/get-docker/) and
[Git](https://git-scm.com/downloads); everything else runs inside the
containers.

## What you get

| | |
| --- | --- |
| \`egykode-controller\` | git, ansible, terraform, kubectl, helm, docker CLI |
| \`egykode-node\` | a second machine over SSH, running real systemd |

Two containers rather than one, because a control node with nothing to manage
can only target localhost — which hides inventories, SSH and every failure mode
worth learning. The node runs systemd so \`systemctl\`, \`journalctl\` and
Ansible's service modules do what they do on a server.

Your work lives in a Docker volume and survives \`./egykode stop\`. \`./egykode
reset\` deletes it, and asks first.

## This repository is generated

The sources live in [the main EgyKode repository](https://github.com/Waleeddarwesh/EgyKode)
under \`docker/\`, \`clusters/\` and the \`egykode\` script. Edit them there;
\`scripts/sync-lab-env.mjs\` regenerates this mirror, and CI fails when the two
drift. Changes made directly here are lost on the next sync.
`;

// ── Compare and write ───────────────────────────────────────────────────────

const planned = new Map();
for (const rel of FILES) {
  const src = join(ROOT, rel);
  if (!existsSync(src)) {
    console.log(`  MISSING SOURCE: ${rel}`);
    process.exitCode = 1;
    continue;
  }
  planned.set(rel, readFileSync(src));
}
planned.set("README.md", Buffer.from(README, "utf8"));
planned.set("labs.json", Buffer.from(JSON.stringify(labRequirements(), null, 2) + "\n", "utf8"));

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

// Files in the mirror that this script no longer produces: a rename left
// behind, and a stale `egykode` is the worst possible thing to leave lying in
// a repository learners run commands out of.
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
  console.log(`${target} is in sync (${planned.size} files).`);
} else {
  console.log(`${changed} file(s) differ.`);
  if (CHECK) {
    console.log("Run: node scripts/sync-lab-env.mjs <target> --write");
    process.exitCode = 1;
  } else if (!WRITE) {
    console.log("Pass --write to apply.");
  }
}
