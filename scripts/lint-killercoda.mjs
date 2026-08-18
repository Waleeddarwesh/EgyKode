#!/usr/bin/env node
/**
 * Validate Killercoda scenarios before they are published.
 *
 * Killercoda builds a scenario from index.json and silently omits anything it
 * cannot resolve: a step whose `text` names a missing file renders blank, and a
 * `verify` pointing nowhere makes the step un-completable. The learner meets a
 * dead end with no error, and the author finds out only if they click through
 * every step of every scenario by hand.
 *
 * So the structure is checked here instead. Nothing in this file talks to
 * Killercoda — it reads the repository and answers one question: if this were
 * published right now, would every step render and every check run?
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = join(ROOT, "killercoda");

/**
 * Backends Killercoda actually offers. An unrecognised imageid is a warning
 * rather than an error — the list moves, and being out of date here must not
 * block a publish. A missing one is an error, because there is no default.
 */
const KNOWN_BACKENDS = new Set([
  "ubuntu",
  "kubernetes-kubeadm-1node",
  "kubernetes-kubeadm-2nodes",
  "kubernetes-kubeadm-3nodes",
]);

let errors = 0;
let warnings = 0;
const fail = (where, msg) => {
  errors += 1;
  console.log(`  ${where}  ${msg}`);
};
const warn = (where, msg) => {
  warnings += 1;
  console.log(`  ${where}  (warning) ${msg}`);
};

if (!existsSync(DIR)) {
  console.log("No killercoda/ directory — nothing to validate.");
  process.exit(0);
}

const scenarios = readdirSync(DIR).filter((f) => statSync(join(DIR, f)).isDirectory());


for (const name of scenarios) {
  const dir = join(DIR, name);
  const where = `killercoda/${name}`;
  const indexPath = join(dir, "index.json");

  if (!existsSync(indexPath)) {
    fail(where, "no index.json — Killercoda will not see this directory as a scenario");
    continue;
  }

  let json;
  try {
    json = JSON.parse(readFileSync(indexPath, "utf8"));
  } catch (e) {
    fail(where, `index.json is not valid JSON: ${e.message}`);
    continue;
  }

  for (const key of ["title", "description"]) {
    if (!json[key] || !String(json[key]).trim()) {
      fail(where, `index.json is missing "${key}"`);
    }
  }

  // The lab this scenario belongs to. Killercoda ignores the key; it exists so
  // that enabling a scenario attaches it to the right lab by declaration
  // rather than by matching directory names, which differ from lab ids often
  // enough that inference would eventually point somewhere wrong.
  if (!json.labId) {
    fail(where, "index.json has no labId — nothing records which lab this scenario is for");
  } else if (!existsSync(join(ROOT, "content", "labs", `${json.labId}.en.mdx`))) {
    fail(where, `labId "${json.labId}" does not match any lab`);
  }

  const backend = json.backend?.imageid;
  if (!backend) fail(where, 'index.json has no backend.imageid — there is no default');
  else if (!KNOWN_BACKENDS.has(backend)) warn(where, `unrecognised backend "${backend}"`);

  const details = json.details;
  if (!details) {
    fail(where, "index.json has no details block");
    continue;
  }

  /** Every filename index.json points at must exist, or that panel renders empty. */
  const refs = [];
  if (details.intro?.text) refs.push(["intro.text", details.intro.text]);
  if (details.intro?.foreground) refs.push(["intro.foreground", details.intro.foreground]);
  if (details.intro?.background) refs.push(["intro.background", details.intro.background]);
  if (details.finish?.text) refs.push(["finish.text", details.finish.text]);

  if (!Array.isArray(details.steps) || details.steps.length === 0) {
    fail(where, "index.json declares no steps");
  } else {
    details.steps.forEach((step, i) => {
      if (!step.title?.trim()) fail(where, `step ${i + 1} has no title`);
      if (!step.text) fail(where, `step ${i + 1} has no text file`);
      else refs.push([`step ${i + 1} text`, step.text]);
      // A step with no verify is legitimate, but for these labs it means the
      // learner can click past without doing anything.
      if (!step.verify) warn(where, `step ${i + 1} has no verify script`);
      else refs.push([`step ${i + 1} verify`, step.verify]);
    });
  }

  for (const [label, file] of refs) {
    if (!existsSync(join(dir, file))) fail(where, `${label} points at "${file}", which does not exist`);
  }

  // Files present but referenced by nothing: usually a rename that half landed.
  const referenced = new Set(refs.map(([, f]) => f));
  for (const file of readdirSync(dir)) {
    if (file === "index.json" || referenced.has(file)) continue;
    warn(where, `"${file}" is not referenced by index.json`);
  }

  // Shell scripts must announce their interpreter: Killercoda runs them
  // directly, and one without a shebang can execute under a different shell
  // than it was written for.
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sh"))) {
    const body = readFileSync(join(dir, file), "utf8");
    if (!body.startsWith("#!")) fail(where, `${file} has no shebang line`);
    if (body.includes("\r\n")) {
      fail(where, `${file} has CRLF line endings — bash fails with "\\r: command not found"`);
    }
  }

  // Step markdown: a command block without {{exec}} is one the learner has to
  // retype by hand, which is never intended in these scenarios.
  for (const [, file] of refs.filter(([l]) => l.includes("text"))) {
    const p = join(dir, file);
    if (!existsSync(p)) continue;
    const body = readFileSync(p, "utf8");
    const execs = (body.match(/```\{\{exec\}\}/g) ?? []).length;
    // Fences that are plainly not commands — a diagram, an expected output —
    // are excluded, so a scenario is not nagged for illustrating something.
    const command = /```(?:bash|sh)?\s*\n(?:sudo |kubectl |docker |git |cd |ls |systemctl |apt|curl |echo )/.test(body);
    // intro.md too, not just steps: the first command a learner meets is the
    // one most worth making clickable, and all three pilots shipped without it.
    if (command && execs === 0 && /step|intro/i.test(file)) {
      warn(where, `${file} has a command block with no {{exec}} button — the learner must retype it`);
    }
  }
}

console.log("");
if (errors === 0 && warnings === 0) {
  console.log(`${scenarios.length} scenario(s) validated — no problems.`);
} else {
  console.log(`${scenarios.length} scenario(s): ${errors} error(s), ${warnings} warning(s).`);
}
process.exit(errors === 0 ? 0 : 1);
