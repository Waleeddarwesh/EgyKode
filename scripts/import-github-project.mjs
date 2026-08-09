/**
 * Import a GitHub repository as an EgyKode project.
 *
 *   node scripts/import-github-project.mjs owner/repo [--featured]
 *
 * WHAT THIS DOES: fetches repository *metadata* and writes
 *   content/projects/<repo>.json   — the project entry
 *   content/authors/<owner>.json   — the repo owner, credited as the author
 *
 * WHAT THIS DELIBERATELY DOES NOT DO: copy anyone's source code into this
 * repository. EgyKode links to the origin and preserves the author's name,
 * avatar and licence. Vendoring third-party code would mean redistributing it
 * under our own licence, which most licences forbid and which is unfair to the
 * author regardless (MASTER_PROMPT §13.6).
 *
 * Unauthenticated GitHub allows 60 requests/hour. Set GITHUB_TOKEN for 5,000.
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const [slugArg, ...flags] = process.argv.slice(2);

if (!slugArg || !slugArg.includes("/")) {
  console.error("usage: node scripts/import-github-project.mjs owner/repo [--featured]");
  process.exit(1);
}

const [owner, repo] = slugArg.replace(/^https?:\/\/github\.com\//, "").split("/");
const headers = {
  Accept: "application/vnd.github+json",
  "User-Agent": "egykode-importer",
  ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
};

async function gh(path) {
  const response = await fetch(`https://api.github.com${path}`, { headers });
  if (!response.ok) {
    throw new Error(`GitHub ${response.status} on ${path} — ${await response.text()}`);
  }
  return response.json();
}

/** Map GitHub topics and languages onto EgyKode's domain taxonomy (§5.3). */
const DOMAIN_HINTS = {
  terraform: "terraform", ansible: "ansible", kubernetes: "kubernetes", k8s: "kubernetes",
  helm: "helm", kustomize: "kustomize", docker: "docker", containers: "docker",
  aws: "aws", jenkins: "jenkins", "github-actions": "github-actions", argocd: "argocd",
  gitops: "gitops", prometheus: "prometheus", grafana: "grafana", observability: "observability",
  monitoring: "observability", security: "security", devsecops: "security", sre: "sre",
  linux: "linux", networking: "networking", "platform-engineering": "platform-engineering",
};

function inferStack(topics, language) {
  const stack = new Set();
  for (const topic of topics) {
    const domain = DOMAIN_HINTS[topic.toLowerCase()];
    if (domain) stack.add(domain);
  }
  if (language === "HCL") stack.add("terraform");
  if (language === "Dockerfile") stack.add("docker");
  return [...stack];
}

function inferLevel(topics) {
  const joined = topics.join(" ");
  if (/advanced|production|enterprise|platform/.test(joined)) return "advanced";
  if (/beginner|starter|tutorial|101/.test(joined)) return "beginner";
  return "intermediate";
}

const repoData = await gh(`/repos/${owner}/${repo}`);
const ownerData = await gh(`/users/${owner}`);
const topics = repoData.topics ?? [];

// ── Author: the repo owner, credited by name and linked back ────────────────
// If an author already exists for this GitHub account, reuse it rather than
// creating a near-duplicate under a different key.
let authorId = ownerData.login.toLowerCase();
const authorsDir = join(ROOT, "content", "authors");
if (existsSync(authorsDir)) {
  const { readdirSync } = await import("node:fs");
  for (const file of readdirSync(authorsDir).filter((f) => f.endsWith(".json"))) {
    const existing = JSON.parse(readFileSync(join(authorsDir, file), "utf8"));
    const gh = String(existing.links?.github ?? "").toLowerCase();
    if (gh.endsWith(`/${ownerData.login.toLowerCase()}`)) {
      authorId = existing.id;
      console.log(`author  matched existing "${existing.id}" by GitHub handle`);
      break;
    }
  }
}
const authorPath = join(ROOT, "content", "authors", `${authorId}.json`);
mkdirSync(dirname(authorPath), { recursive: true });

if (existsSync(authorPath)) {
  console.log(`author  content/authors/${authorId}.json already exists — left untouched`);
} else {
  writeFileSync(
    authorPath,
    JSON.stringify(
      {
        id: authorId,
        name: ownerData.name || ownerData.login,
        handle: ownerData.login,
        headline: ownerData.bio || "",
        location: ownerData.location || "",
        bio: ownerData.bio || "",
        // Hotlinking avatars leaks visitor IPs to GitHub. Mirror this file to
        // /authors/<id>.jpg before launch and switch `avatar` to the local path.
        avatar: `${ownerData.avatar_url}&s=200`,
        links: {
          github: ownerData.html_url,
          ...(ownerData.blog ? { website: ownerData.blog } : {}),
        },
        source: "github",
        role: "contributor",
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );
  console.log(`author  wrote content/authors/${authorId}.json`);
}

// ── Project ─────────────────────────────────────────────────────────────────
const project = {
  id: repoData.name.toLowerCase(),
  title: repoData.name.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
  summary: repoData.description || "",
  why: "",
  author: authorId,
  repo: repoData.html_url,
  license: repoData.license?.spdx_id ?? "NOASSERTION",
  level: inferLevel(topics),
  featured: flags.includes("--featured"),
  stack: inferStack(topics, repoData.language),
  highlights: [],
  phases: [],
  source: {
    kind: "github",
    stars: repoData.stargazers_count,
    forks: repoData.forks_count,
    defaultBranch: repoData.default_branch,
    importedAt: new Date().toISOString().slice(0, 10),
  },
  updated: repoData.pushed_at.slice(0, 10),
};

const projectPath = join(ROOT, "content", "projects", `${project.id}.json`);
mkdirSync(dirname(projectPath), { recursive: true });
writeFileSync(projectPath, JSON.stringify(project, null, 2) + "\n", "utf8");

console.log(`project wrote content/projects/${project.id}.json`);
console.log(`\n  ${project.title} — ${project.license}, by ${ownerData.name || ownerData.login}`);
console.log(`  stack: ${project.stack.join(", ") || "(none inferred — fill in by hand)"}`);
if (!project.summary) console.log("  ! no description on the repo — add `summary` by hand");
if (project.license === "NOASSERTION") {
  console.log("  ! no detectable licence. Do not feature a repo whose licence is unclear.");
}
