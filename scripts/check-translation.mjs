/**
 * Translation QA (MASTER_PROMPT §2.3, §11.6).
 *
 * Compares each `<slug>.ar.mdx` against its English source and fails on the
 * things that silently break a technical translation. Grammar is a human
 * review problem; these are the machine-checkable failures, and they are the
 * ones that make a translated chapter actively wrong rather than merely
 * clumsy.
 *
 * Run: node scripts/check-translation.mjs
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LEARN = join(ROOT, "content", "learn");

/** Terms that must never be transliterated or translated (Category A, §2.3). */
const CANONICAL = [
  "Kubernetes", "Docker", "Terraform", "Ansible", "Jenkins", "Argo CD", "ArgoCD",
  "GitHub", "GitOps", "AWS", "Linux", "Nginx", "Prometheus", "Grafana", "Helm",
  "Git", "kubeadm", "Kustomize", "Loki", "Nexus", "SonarQube", "Trivy",
];

/** Transliterations that must not appear anywhere in Arabic content. */
const FORBIDDEN_TRANSLITERATIONS = [
  "كوبرنيتس", "كوبيرنيتس", "دوكر", "تيرافورم", "أنسبل", "انسبل", "جينكينز",
  "بروميثيوس", "جرافانا", "هيلم", "لينكس", "كستومايز", "جيت أوبس",
];

const errors = [];
const warnings = [];

/**
 * Line endings and trailing spaces are platform artifacts, not translation
 * differences: the migration wrote CRLF on Windows while editors write LF.
 * Comparing raw text reported every code block as modified.
 */
const normalize = (text) => text.replace(/\r\n/g, "\n").replace(/[ \t]+$/gm, "");

function frontmatterAndBody(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return [{}, raw];
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv) data[kv[1]] = kv[2].trim().replace(/^"(.*)"$/, "$1");
  }
  return [data, raw.slice(match[0].length)];
}

/** Fenced code blocks, verbatim, including the language tag. */
const fences = (body) => [...body.matchAll(/```[\s\S]*?```/g)].map((m) => m[0]);
const inlineCode = (body) => [...body.matchAll(/`[^`\n]+`/g)].map((m) => m[0]);
const headings = (body) =>
  [...body.matchAll(/^(#{2,6})\s+/gm)].map((m) => m[1].length);
const links = (body) => [...body.matchAll(/\]\(([^)]+)\)/g)].map((m) => m[1]);

let pairs = 0;

for (const domain of readdirSync(LEARN, { withFileTypes: true })) {
  if (!domain.isDirectory()) continue;
  const dir = join(LEARN, domain.name);

  for (const name of readdirSync(dir)) {
    if (!name.endsWith(".ar.mdx")) continue;
    pairs += 1;

    const arPath = join(dir, name);
    const enPath = join(dir, name.replace(".ar.mdx", ".en.mdx"));
    const file = relative(ROOT, arPath).replaceAll("\\", "/");

    if (!existsSync(enPath)) {
      errors.push(`${file}  no English source — an orphan translation`);
      continue;
    }

    const [arMeta, arBody] = frontmatterAndBody(normalize(readFileSync(arPath, "utf8")));
    const [enMeta, enBody] = frontmatterAndBody(normalize(readFileSync(enPath, "utf8")));

    // ── Identity ────────────────────────────────────────────────────────────
    if (arMeta.contentId !== enMeta.contentId) {
      errors.push(`${file}  contentId "${arMeta.contentId}" != "${enMeta.contentId}"`);
    }
    if (!["reviewed", "machine-draft"].includes(arMeta.translationStatus ?? "")) {
      errors.push(
        `${file}  translationStatus must be "machine-draft" or "reviewed", got "${arMeta.translationStatus}"`,
      );
    }

    // ── Code is never translated ────────────────────────────────────────────
    const enFences = fences(enBody);
    const arFences = fences(arBody);
    if (enFences.length !== arFences.length) {
      errors.push(
        `${file}  ${arFences.length} code block(s), English has ${enFences.length}`,
      );
    } else {
      enFences.forEach((block, i) => {
        if (block !== arFences[i]) {
          const line = block.split("\n")[1]?.trim().slice(0, 50) ?? "";
          errors.push(`${file}  code block ${i + 1} was modified — "${line}"`);
        }
      });
    }

    const enInline = new Set(inlineCode(enBody));
    for (const code of enInline) {
      if (!arBody.includes(code)) {
        warnings.push(`${file}  inline code missing from translation: ${code}`);
      }
    }

    // ── Structure survives ──────────────────────────────────────────────────
    const enH = headings(enBody);
    const arH = headings(arBody);
    if (enH.length !== arH.length) {
      errors.push(`${file}  ${arH.length} heading(s), English has ${enH.length}`);
    } else if (enH.join() !== arH.join()) {
      errors.push(`${file}  heading levels differ from the English source`);
    }

    // ── Links resolve to the same targets ───────────────────────────────────
    const enLinks = links(enBody).sort();
    const arLinks = links(arBody).sort();
    for (const href of enLinks) {
      if (!arLinks.includes(href)) {
        errors.push(`${file}  link target missing or altered: ${href}`);
      }
    }

    // ── Terminology ─────────────────────────────────────────────────────────
    for (const bad of FORBIDDEN_TRANSLITERATIONS) {
      if (arBody.includes(bad) || (arMeta.title ?? "").includes(bad)) {
        errors.push(`${file}  transliterated product name "${bad}" — keep it in Latin script`);
      }
    }
    for (const term of CANONICAL) {
      const inEn = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (inEn.test(enBody) && !inEn.test(arBody)) {
        warnings.push(`${file}  "${term}" appears in English but not in the translation`);
      }
    }
  }
}

// ── Report ────────────────────────────────────────────────────────────────
const total = readdirSync(LEARN, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .reduce(
    (n, d) => n + readdirSync(join(LEARN, d.name)).filter((f) => f.endsWith(".en.mdx")).length,
    0,
  );

console.log(`translation QA — ${pairs} translated of ${total} chapter(s)\n`);

if (warnings.length) {
  console.log(`warnings (${warnings.length}):`);
  for (const w of warnings.slice(0, 15)) console.log(`  ${w}`);
  if (warnings.length > 15) console.log(`  … ${warnings.length - 15} more`);
  console.log();
}

if (errors.length) {
  console.log(`errors (${errors.length}):`);
  for (const e of errors.slice(0, 25)) console.log(`  ${e}`);
  process.exit(1);
}

console.log(pairs === 0 ? "no translations yet — nothing to check" : "all translations pass");
