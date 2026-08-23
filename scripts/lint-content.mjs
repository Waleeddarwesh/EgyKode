/**
 * Content linter (MASTER_PROMPT §11.6). Runs in CI; a failure blocks the merge.
 *
 * A content rule that is not enforced by a machine is a rule that decays, so
 * every check here is one that would otherwise rot silently.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import matter from "gray-matter";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT = join(ROOT, "content");
const MESSAGES = join(ROOT, "apps", "web", "messages");

// The domain allow-list comes from the registry, not from the catalogue.
//
// It used to be derived from content/index.json, which made this linter check
// chapters against a list built out of chapters: any domain could be declared
// valid simply by a chapter declaring it, and a domain whose only chapter fell
// out of the index would silently drop out of the allow-list. content/domains.json
// is the actual registry - it carries the titles and blurbs the topic pages
// render - so a typo'd domain now fails instead of quietly widening the set.
const DOMAINS = new Set(
  Object.keys(JSON.parse(readFileSync(join(CONTENT, "domains.json"), "utf8")).domains),
);
const LEVELS = new Set(["beginner", "intermediate", "advanced", "expert", "all"]);
const TYPES = new Set(["concept", "howto", "reference", "lab", "decision", "troubleshooting", "interview", "course"]);
const REQUIRED = ["contentId", "title", "description", "domain", "level", "type", "status"];

// Words that tell a stuck reader the problem is them (§11.6).
const BANNED = /\b(simply|just remember|obviously|as you can see|it'?s easy|trivially)\b/i;

const errors = [];
const warnings = [];

function fail(file, line, message) {
  errors.push(`${file}${line ? `:${line}` : ""}  ${message}`);
}
function warn(file, message) {
  warnings.push(`${file}  ${message}`);
}

// ── 1. Frontmatter ──────────────────────────────────────────────────────────
function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv) data[kv[1]] = kv[2].trim().replace(/^"(.*)"$/, "$1");
  }
  return data;
}

const chapters = [];
const learnDir = join(CONTENT, "learn");
for (const domain of readdirSync(learnDir, { withFileTypes: true })) {
  if (!domain.isDirectory()) continue;
  for (const name of readdirSync(join(learnDir, domain.name))) {
    if (!name.endsWith(".mdx")) continue;
    const path = join(learnDir, domain.name, name);
    const file = relative(ROOT, path).replaceAll("\\", "/");
    const raw = readFileSync(path, "utf8");

    const fm = parseFrontmatter(raw);
    if (!fm) {
      fail(file, 1, "missing or malformed frontmatter");
      continue;
    }
    for (const key of REQUIRED) {
      if (!fm[key]) fail(file, 1, `frontmatter missing required field "${key}"`);
    }
    if (fm.domain && !DOMAINS.has(fm.domain)) fail(file, 1, `unknown domain "${fm.domain}"`);
    if (fm.level && !LEVELS.has(fm.level)) fail(file, 1, `unknown level "${fm.level}"`);
    if (fm.type && !TYPES.has(fm.type)) fail(file, 1, `unknown type "${fm.type}"`);
    if (fm.domain && fm.domain !== domain.name) {
      fail(file, 1, `domain "${fm.domain}" does not match directory "${domain.name}"`);
    }
    // `getChapter(domain, slug)` builds the path from the slug, and the slug is
    // the contentId. A file whose stem differs still appears in the index and
    // in generateStaticParams, so the route is created — and then renders
    // notFound() because the body cannot be found. Under static export that
    // becomes a "Page not found" page served with HTTP 200, which no
    // status-code check can catch. Five chapters shipped that way once.
    const stem = name.replace(/\.[a-z]{2}\.mdx$/, "");
    if (fm.contentId && fm.contentId !== stem) {
      fail(file, 1, `contentId "${fm.contentId}" must match the filename "${stem}.<locale>.mdx"`);
    }
    chapters.push({ file, fm, raw });

    // ── 2. Body rules ───────────────────────────────────────────────────────
    const body = raw.split(/^---$/m).slice(2).join("---");
    let inFence = false;
    body.split(/\r?\n/).forEach((line, i) => {
      const lineNo = i + 1;
      if (line.trimStart().startsWith("```")) {
        // A fence must declare a language so highlighting and copy work.
        if (!inFence && line.trim() === "```") warn(file, `line ${lineNo}: code fence without a language`);
        inFence = !inFence;
        return;
      }
      if (inFence) return;
      if (BANNED.test(line)) {
        warn(file, `line ${lineNo}: banned phrasing — "${line.match(BANNED)[0]}"`);
      }
      // Images must carry alt text.
      const img = line.match(/!\[\s*\]\(/);
      if (img) fail(file, lineNo, "image missing alt text");

      // A chapter referred to by number goes stale the moment one is
      // inserted, and does so silently. All 34 of these were wrong at once —
      // "In Chapter 09, we learned that Docker…" resolved to Build Tools.
      // Link by slug instead; a link cannot drift out of order.
      const num = line.match(/\bChapters? \d{1,2}\b/);
      if (num) {
        fail(file, lineNo, `chapter referenced by number ("${num[0]}") — link to it by name instead`);
      }
    });
  }
}

// ── 2b. Execution options ───────────────────────────────────────────────────
//
// `handsOn` is optional and each of its three options is optional within it —
// a lab whose subject is IAM has nothing to apologise for by offering only
// `cloud`. So the checks are narrow: a link, once written, must be real, and
// an option claiming to be enabled must carry what it needs to work. A typo
// here ships a button that takes a learner nowhere.
/**
 * What `./egykode start <name>` can actually bring up.
 *
 * Read from the tooling rather than listed here. A hardcoded set would be a
 * third copy of the same fact — after the lab frontmatter and the tooling
 * itself — and the first one to go stale would be the one asserting the other
 * two are fine.
 */
const ENVIRONMENTS = (() => {
  const found = new Set(["base"]); // no profile: controller + node, always up
  const compose = join(ROOT, "docker-compose.yml");
  if (existsSync(compose)) {
    for (const m of readFileSync(compose, "utf8").matchAll(/^\s*profiles:\s*\[([^\]]+)\]/gm)) {
      for (const p of m[1].split(",")) found.add(p.trim());
    }
  }
  // Names the wrapper handles itself. `k8s` is not a Compose profile — it
  // creates a kind cluster on the host and joins the controller to it.
  //
  // Scoped to the `start)` branch: scanning the whole file also collected the
  // `cluster)` subcommands, so `environment: delete` would have linted clean.
  const cli = join(ROOT, "egykode");
  if (existsSync(cli)) {
    const start = readFileSync(cli, "utf8").match(/^ {2}start\)$([\s\S]*?)^ {4};;$/m)?.[1] ?? "";
    for (const m of start.matchAll(/^ {6}(\w[\w-]*)\)\s*$/gm)) found.add(m[1]);
  }
  return found;
})();

{
  const labsDir = join(CONTENT, "labs");
  if (existsSync(labsDir)) {
    for (const file of readdirSync(labsDir).filter((f) => f.endsWith(".mdx"))) {
      const raw = readFileSync(join(labsDir, file), "utf8");
      // `(?=^\S|\Z)` here had the same literal-"Z" bug described below. It
      // happened to work because `successCriteria:` always follows handsOn, so
      // `^\S` always matched — a latent failure waiting for the day handsOn is
      // written last. Ends at the next top-level key or the end of input.
      const handsOn = raw.match(/^handsOn:\s*$([\s\S]*?)(?=^\S|$(?![\s\S]))/m)?.[1];
      if (!handsOn) continue;

      const where = `content/labs/${file}`;

      // Split on the two-space-indented keys rather than using a lookahead.
      //
      // The first version ended each option with `(?=^  \w|\Z)`, and `\Z` is
      // not a JavaScript token — it matched a literal "Z". The last option in
      // the block therefore never matched at all and its rule was skipped
      // silently, which a mutation test caught and a passing run never would.
      const option = (name) => {
        const lines = handsOn.split(/\r?\n/);
        const start = lines.findIndex((l) => new RegExp(`^  ${name}:\\s*$`).test(l));
        if (start === -1) return undefined;
        const body = [];
        for (const line of lines.slice(start + 1)) {
          if (/^ {0,2}\S/.test(line)) break; // next option, or back to top level
          body.push(line);
        }
        return body.join("\n");
      };

      const online = option("online");
      if (online) {
        const enabled = /^\s+enabled:\s*true\s*$/m.test(online);
        const url = online.match(/^\s+url:\s*["']?([^"'\r\n]*)["']?\s*$/m)?.[1]?.trim();
        if (enabled && !url) {
          fail(where, null, "handsOn.online.enabled is true but no url is set");
        } else if (enabled && !/^https:\/\/(www\.)?killercoda\.com\/\S+$/.test(url)) {
          fail(where, null, `handsOn.online.url "${url}" is not an https killercoda.com URL`);
        }
      }

      // A local option with no tools cannot tell a learner what to install,
      // and `doctor` has nothing to evaluate against.
      const local = option("local");
      if (local && /^\s+enabled:\s*true\s*$/m.test(local) && !/^\s+tools:\s*$/m.test(local)) {
        fail(where, null, "handsOn.local is enabled but lists no tools");
      }

      // The environment must be one `./egykode` actually provides.
      //
      // 27 labs once declared `environment: k8s` when no such thing existed.
      // The lab page rendered `./egykode start k8s`, Compose accepts an unknown
      // profile without complaint, and the command printed "Ready" having
      // started nothing — so the failure surfaced minutes later as a kubectl
      // connection error with no path back to its cause.
      if (local) {
        const env = local.match(/^\s+environment:\s*(\S+)\s*$/m)?.[1];
        if (env && !ENVIRONMENTS.has(env)) {
          fail(
            where,
            null,
            `handsOn.local.environment "${env}" is not provided by ./egykode ` +
              `(known: ${[...ENVIRONMENTS].sort().join(", ")})`,
          );
        }
      }

      // The UI must never imply EgyKode pays for a learner's cloud usage.
      const cloud = option("cloud");
      if (cloud && /^\s+enabled:\s*true\s*$/m.test(cloud) && !/requiresOwnAccount:\s*true/.test(cloud)) {
        fail(where, null, "handsOn.cloud is enabled but does not set requiresOwnAccount: true");
      }
    }
  }
}

/**
 * How many success criteria a lab declares.
 *
 * Counted from the block only — reading to the end of the frontmatter also
 * swept up `cleanup:` commands, which would let a step point at a criterion
 * index that does not exist while lint called it valid.
 */
function countCriteria(raw) {
  const fm = raw.match(/^---([\s\S]*?)\r?\n---/)?.[1] ?? "";
  const lines = fm.split(/\r?\n/);
  const at = lines.findIndex((l) => /^successCriteria:/.test(l));
  if (at === -1) return 0;
  let n = 0;
  for (const line of lines.slice(at + 1)) {
    if (/^\S/.test(line)) break;
    if (/^\s+-\s+/.test(line)) n += 1;
  }
  return n;
}

// ── 2b-ii. Related practice ─────────────────────────────────────────────────
//
// Outbound links to other people's scenarios. They point at content nobody
// here controls, and no automated check distinguishes a live Killercoda URL
// from a dead one — so the rules that can be enforced are enforced, and the
// rest stays a human's job.
{
  const labsDir = join(CONTENT, "labs");
  if (existsSync(labsDir)) {
    for (const file of readdirSync(labsDir).filter((f) => f.endsWith(".mdx"))) {
      const raw = readFileSync(join(labsDir, file), "utf8");
      const fm = raw.match(/^---([\s\S]*?)\r?\n---/)?.[1] ?? "";
      if (!/^relatedPractice:/m.test(fm)) continue;
      const where = `content/labs/${file}`;

      const lines = fm.split(/\r?\n/);
      const at = lines.findIndex((l) => /^relatedPractice:/.test(l));
      const block = [];
      for (const line of lines.slice(at + 1)) {
        if (/^\S/.test(line)) break;
        block.push(line);
      }

      const urls = block.filter((l) => /^\s+url:/.test(l)).map((l) => l.replace(/^\s+url:\s*/, "").trim());
      const titles = block.filter((l) => /^\s+-?\s*title:/.test(l)).length;

      if (urls.length !== titles) {
        fail(where, null, `relatedPractice has ${titles} title(s) and ${urls.length} url(s) — each entry needs both`);
      }
      for (const url of urls) {
        const clean = url.replace(/^["']|["']$/g, "");
        if (!/^https:\/\//.test(clean)) {
          fail(where, null, `relatedPractice url is not https: ${clean}`);
        }
      }
    }
  }
}

// ── 2c. Lab step format ─────────────────────────────────────────────────────
//
// These apply only to labs that have been migrated to `<LabStep>`. A lab using
// the older heading format is untouched, which is what makes the rollout
// incremental: converting a lab opts it into the contract, and nothing has to
// happen to the other 113 on the same day.
{
  const labsDir = join(CONTENT, "labs");
  if (existsSync(labsDir)) {
    for (const file of readdirSync(labsDir).filter((f) => f.endsWith(".mdx"))) {
      const raw = readFileSync(join(labsDir, file), "utf8");
      const where = `content/labs/${file}`;
      const body = raw.replace(/^---[\s\S]*?\r?\n---/, "");

      const steps = [...body.matchAll(/<LabStep\b([^>]*)>/g)];
      const migrated = steps.length > 0;

      if (migrated) {
        for (const [, attrs] of steps) {
          const n = attrs.match(/n=\{(\d+)\}/)?.[1] ?? "?";

          // `proves` is the step's reason for existing. Without it a step is a
          // list of commands, which is the shape the format was built to
          // replace — so it is required rather than encouraged.
          const proves = attrs.match(/proves="([^"]*)"/)?.[1];
          if (!proves?.trim()) {
            fail(where, null, `<LabStep n={${n}}> has no proves — every step must state the capability it gives the learner`);
            continue;
          }

          // A capability, not a transcript. "You ran ss" describes what
          // happened; "You can identify the process holding a port" describes
          // what the learner can now do, and only the second is checkable by
          // the person who did it.
          if (/^\s*you\s+(ran|executed|typed|copied|used\s+the\s+command|created\s+a\s+file\s+called)\b/i.test(proves)) {
            fail(where, null, `<LabStep n={${n}}> proves describes an action, not a capability: "${proves.slice(0, 60)}"`);
          }
          if (!/^\s*you\s+can\b/i.test(proves)) {
            fail(where, null, `<LabStep n={${n}}> proves should read as a capability, starting "You can …": "${proves.slice(0, 60)}"`);
          }

          // The criterion a step settles must exist, and must be written as a
          // number or an array literal.
          //
          // `criterion={1,4}` is not a syntax error — it is a JS comma
          // expression evaluating to 4 — so MDX renders it happily and the step
          // ticks one criterion instead of two. An index past the end is the
          // same class of quiet wrong: the tick lands on nothing.
          const rawCriterion = attrs.match(/criterion=\{([^}]*)\}/)?.[1]?.trim();
          if (rawCriterion !== undefined) {
            if (/^\d+\s*,/.test(rawCriterion)) {
              fail(where, null, `<LabStep n={${n}}> criterion={${rawCriterion}} is a comma expression — write criterion={[${rawCriterion}]}`);
            } else {
              const indices = rawCriterion.startsWith("[")
                ? rawCriterion.slice(1, -1).split(",").map((v) => Number(v.trim()))
                : [Number(rawCriterion)];
              const total = countCriteria(raw);
              for (const idx of indices) {
                if (!Number.isInteger(idx) || idx < 1 || idx > total) {
                  fail(where, null, `<LabStep n={${n}}> criterion ${idx} does not exist — the lab has ${total}`);
                }
              }
            }
          }
        }
      }

      // The troubleshooting section is a peer of the steps, not a child of one.
      //
      // The converter matched only markdown headings when deciding where a step
      // ended, so the last step swallowed the whole <Troubleshooting> block —
      // which then rendered inside a collapsed step body instead of as its own
      // section. Fifteen labs shipped that way and nothing failed: the tags
      // balanced, the MDX compiled, and the section was simply invisible.
      for (const [, stepBody] of body.matchAll(/<LabStep[^>]*>([\s\S]*?)<\/LabStep>/g)) {
        if (/<Troubleshooting\b/.test(stepBody)) {
          fail(where, null, "<Troubleshooting> is nested inside a <LabStep> — it belongs after the steps");
        }
      }

      // Every lab teaches at least one failure, wherever it lives: inside a
      // step for a failure that step causes, or in the trailing section for one
      // that spans the system. A lab with neither teaches only the happy path.
      const tier = raw.match(/^tier:\s*(.*)$/m)?.[1]?.trim();
      if (tier === "guided") {
        const hasStepIncident = /<Incident\b/.test(body);
        // Either shape: the heading in an unconverted lab, or the component
        // that replaces it once the lab has been converted.
        const hasSection =
          /^## Troubleshooting & Incidents\s*$/m.test(body) || /<Troubleshooting\b/.test(body);
        if (!hasStepIncident && !hasSection) {
          fail(where, null, "no troubleshooting — add an <Incident> to a step, or a Troubleshooting section");
        }
        // The old heading, caught so the corpus does not drift back into two
        // names for one section.
        if (/^## When it goes wrong\s*$/m.test(body)) {
          fail(where, null, "'## When it goes wrong' is now '## Troubleshooting & Incidents'");
        }
      }
    }
  }
}

// ── 3. Cross-references resolve ─────────────────────────────────────────────
const ids = new Set(chapters.map((c) => c.fm.contentId));
for (const { file, raw } of chapters) {
  for (const field of ["prerequisites", "relatedChapters"]) {
    const match = raw.match(new RegExp(`^${field}:\\s*\\[(.*)\\]`, "m"));
    if (!match || !match[1].trim()) continue;
    for (const ref of match[1].split(",").map((s) => s.trim().replace(/"/g, ""))) {
      if (ref && !ids.has(ref)) fail(file, 1, `${field} references unknown contentId "${ref}"`);
    }
  }
}

// Prose links to other chapters. Replacing the stale "Chapter NN" references
// with links only helps if the links resolve — the first run of this check
// found one pointing at /learn/kubernetes/k8s-security/, which lives under
// /learn/security/. A chapter moving directory breaks these silently.
{
  const urls = new Set(chapters.map((c) => `/learn/${c.fm.domain}/${c.fm.contentId}`));
  for (const { file, raw } of chapters) {
    for (const m of raw.matchAll(/\]\((\/learn\/[^)#?\s]*)/g)) {
      const target = m[1].replace(/\/$/, "");
      if (!urls.has(target)) fail(file, null, `link to "${m[1]}" does not resolve to a chapter`);
    }
  }
}

// ── 4. Roadmap integrity — every roadmap, not just the flagship ─────────────
const roadmapDir = join(CONTENT, "roadmaps");
const placed = new Set();
for (const name of readdirSync(roadmapDir).filter((f) => f.endsWith(".json"))) {
  const file = `content/roadmaps/${name}`;
  const roadmap = JSON.parse(readFileSync(join(roadmapDir, name), "utf8"));
  const refs = [...roadmap.phases.flatMap((p) => p.chapters), ...(roadmap.reference ?? [])];
  for (const id of refs) {
    if (!ids.has(id)) fail(file, null, `references unknown chapter "${id}"`);
    placed.add(id);
  }
  // The core promise is structural (§6.0): a roadmap without a terminal
  // project is a reading list, and must not ship as a roadmap.
  if (!roadmap.productionProject?.title) {
    fail(file, null, "roadmap has no productionProject — every roadmap must end with one");
  }
  // The terminal project must resolve, or "Ends with" links nowhere. Two
  // roadmaps shipped pointing at project ids that did not exist.
  const pid = roadmap.productionProject?.id;
  if (pid && existsSync(join(CONTENT, "projects")) &&
      !readdirSync(join(CONTENT, "projects")).includes(`${pid}.json`)) {
    fail(file, null, `productionProject.id "${pid}" does not match any content/projects file`);
  }
}
for (const id of ids) {
  if (!placed.has(id)) warn("roadmaps", `chapter "${id}" is not placed in any roadmap`);
}

// ── 4b. Projects reference a known author and declare a licence ─────────────
const projectDir = join(CONTENT, "projects");
if (existsSync(projectDir)) {
  const authors = new Set(
    readdirSync(join(CONTENT, "authors"))
      .filter((f) => f.endsWith(".json"))
      .map((f) => JSON.parse(readFileSync(join(CONTENT, "authors", f), "utf8")).id),
  );
  for (const name of readdirSync(projectDir).filter((f) => f.endsWith(".json"))) {
    const file = `content/projects/${name}`;
    const project = JSON.parse(readFileSync(join(projectDir, name), "utf8"));
    if (!authors.has(project.author)) fail(file, null, `unknown author "${project.author}"`);
    if (!project.repo && project.repoStatus !== "unpublished") {
      fail(file, null, 'missing repo URL — set one, or mark repoStatus: "unpublished"');
    }
    // Featuring a repo whose licence is unclear is a legal and ethical problem.
    if (project.featured && (!project.license || project.license === "NOASSERTION")) {
      fail(file, null, "featured project has no clear licence");
    }
  }
}

// ── 4d. Every chapter states its relationship to the capstone ──────────────
//
// The curriculum contains three legitimately different kinds of chapter, and
// not saying which is which is what makes it read as self-contradictory: the
// RDS chapter teaching a managed database while the capstone deliberately runs
// MySQL as a StatefulSet is the clearest case. A reader cannot tell whether
// they are behind or simply reading about a road not taken.
//
// `alternative` and `extension` additionally require `capstoneWhy`, because
// the label alone leaves the more useful question — *why not this one?* —
// unanswered, and an unexplained label is decoration.
{
  const ROLES = new Set(["core", "alternative", "extension", "reference"]);
  /**
   * The phases of the *build*, which are not the curriculum's eleven. A
   * chapter is taught in one place and used in another, and this names the
   * second. Fixed set on purpose: an arbitrary string cannot be linted or
   * grouped, and unlintable metadata is how a classification decays into
   * decoration.
   */
  const CAPSTONE_PHASES = new Set([
    "foundations", "application", "aws", "infrastructure",
    "kubernetes", "delivery", "gitops", "observability", "operations",
  ]);
  const learnDir = join(CONTENT, "learn");
  if (existsSync(learnDir)) {
    for (const domain of readdirSync(learnDir, { withFileTypes: true })) {
      if (!domain.isDirectory()) continue;
      for (const name of readdirSync(join(learnDir, domain.name)).filter((f) => f.endsWith(".en.mdx"))) {
        const where = `content/learn/${domain.name}/${name}`;
        const front = readFileSync(join(learnDir, domain.name, name), "utf8")
          .match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "";

        const role = front.match(/^capstoneRole:\s*(\S+)/m)?.[1];
        if (!role) {
          fail(where, null,
            "no capstoneRole — every chapter must say whether the capstone is built with this (core), chose differently (alternative), extends beyond it (extension), or it is look-up material (reference)");
          continue;
        }
        if (!ROLES.has(role)) {
          fail(where, null, `capstoneRole "${role}" is not one of: ${[...ROLES].join(", ")}`);
        }
        if ((role === "alternative" || role === "extension") && !/^capstoneWhy:/m.test(front)) {
          fail(where, null,
            `capstoneRole is "${role}" but there is no capstoneWhy — a label without the reasoning tells a reader they can skip this, and nothing about why the capstone went the other way`);
        }

        // ── And *where* in the capstone, not only whether ──────────────────
        //
        // The role answers "does this apply to me". The mapping answers "so
        // where does it actually appear", which is the question a reader has
        // next and the one that makes the curriculum a graph rather than a
        // list. Reference chapters are exempt: they sit outside the build.
        //
        // The phase is drawn from a fixed set. An arbitrary string would make
        // the mapping unlintable and un-groupable, which is exactly how this
        // kind of metadata decays into decoration.
        if (role !== "reference") {
          const phase = front.match(/^capstonePhase:\s*(\S+)/m)?.[1];
          if (!phase) {
            fail(where, null, "no capstonePhase — every non-reference chapter must say where in the capstone it appears");
          } else if (!CAPSTONE_PHASES.has(phase)) {
            fail(where, null, `capstonePhase "${phase}" is not one of: ${[...CAPSTONE_PHASES].join(", ")}`);
          }
          if (!/^capstoneComponent:/m.test(front)) {
            fail(where, null, "no capstoneComponent — name the part of the platform this teaches");
          }
          if (!/^capstonePurpose:/m.test(front)) {
            fail(where, null, "no capstonePurpose — one sentence on what this contributes to the build");
          }
        }
      }
    }
  }
}

// ── 4c. The Project Path must reference labs that exist ────────────────────
//
// `getResolvedPath()` drops any id it cannot resolve, so a typo does not throw
// — the lab simply disappears from the path, and the only visible symptom is
// that two counts on the same page stop agreeing. That is precisely how a
// reader comes to see "58 steps" above a library that says 54 and concludes
// the site cannot count.
//
// The two numbers are legitimately different — the library lists guided labs,
// while the path also walks the incidents and the capstone — so this does not
// force them to match. It asserts the thing that must be true: every id in the
// path resolves to a real lab, and no lab is silently listed twice.
{
  const pathFile = join(CONTENT, "labs", "path.json");
  const labsDir = join(CONTENT, "labs");
  if (existsSync(pathFile) && existsSync(labsDir)) {
    const labPath = JSON.parse(readFileSync(pathFile, "utf8"));
    const existing = new Set(
      readdirSync(labsDir)
        .filter((f) => f.endsWith(".en.mdx"))
        .map((f) => f.replace(".en.mdx", "")),
    );

    const seen = new Map();
    for (const phase of labPath.phases ?? []) {
      for (const id of phase.labs ?? []) {
        if (!existing.has(id)) {
          fail("content/labs/path.json", null,
            `phase "${phase.id}" lists "${id}", which has no lab file — it will vanish from the path with no error`);
        }
        if (seen.has(id)) {
          fail("content/labs/path.json", null,
            `"${id}" appears in both "${seen.get(id)}" and "${phase.id}" — a lab counted twice inflates the path`);
        }
        seen.set(id, phase.id);
      }
    }

    // ── The dependency graph must agree with the order it annotates ───────
    //
    // `requires` says this lab consumes something an earlier lab produced. If
    // the producer comes *later* in the path, the reader is told to build with
    // a thing that does not exist yet — and the failure is silent, because
    // both the edge and the ordering look reasonable in isolation.
    const graph = labPath.graph ?? {};
    const position = new Map([...seen.keys()].map((id, i) => [id, i]));

    for (const [id, node] of Object.entries(graph)) {
      if (!position.has(id)) {
        fail("content/labs/path.json", null,
          `graph has an entry for "${id}", which is not in any phase`);
        continue;
      }
      if (!node.produces?.length) {
        fail("content/labs/path.json", null, `"${id}" declares nothing in \`produces\``);
      }
      for (const dep of node.requires ?? []) {
        if (!position.has(dep)) {
          fail("content/labs/path.json", null,
            `"${id}" requires "${dep}", which is not in the path`);
        } else if (position.get(dep) >= position.get(id)) {
          fail("content/labs/path.json", null,
            `"${id}" requires "${dep}", which the path places later — the reader would need it before it exists`);
        }
      }
    }

    // Every lab on the path should say what it leaves behind, or the "what
    // does this add to the platform" promise has a hole in it.
    for (const id of position.keys()) {
      if (!graph[id]) {
        fail("content/labs/path.json", null, `"${id}" is on the path but has no graph entry`);
      }
    }

    // ── And every lab *page* must resolve one, directly or through its pair ─
    //
    // Half the pages saying where they fit and half saying nothing is the
    // inconsistency a reader notices first. A challenge inherits its guided
    // pair's contribution, so what this really checks is that no lab is
    // stranded: off the path, and with no pair to inherit from.
    for (const file of readdirSync(labsDir).filter((f) => f.endsWith(".en.mdx"))) {
      const id = file.replace(".en.mdx", "");
      if (graph[id]) continue;
      const front = readFileSync(join(labsDir, file), "utf8").match(/^---\r?\n([\s\S]*?)\r?\n---/);
      const pair = front?.[1].match(/^guidedLabId:\s*(\S+)/m)?.[1];
      if (!pair || !graph[pair]) {
        fail(`content/labs/${file}`, null,
          "no contribution to the platform: this lab is not on the Project Path and has no guided pair to inherit from, so its page cannot say where it fits");
      }
    }
  }
}

// ── 4b. A billable lab must state its cost and how to clean up ─────────────
//
// Seventeen labs once provisioned EKS control planes, NAT Gateways and RDS
// instances while saying nothing about what they cost or how to destroy them.
// A learner who leaves an EKS cluster running over a weekend has been failed by
// the lab, not by AWS — so this is an error, not a warning.
{
  const labsDir = join(CONTENT, "labs");
  if (existsSync(labsDir)) {
    for (const file of readdirSync(labsDir).filter((f) => f.endsWith(".en.mdx"))) {
      const raw = readFileSync(join(labsDir, file), "utf8");
      const front = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (!front) continue;
      const block = front[1];

      const billable = /^cloudCost:\s*true\s*$/m.test(block);
      if (!billable) continue;

      const where = `content/labs/${file}`;
      if (!/^costEstimate:/m.test(block)) {
        fail(where, null, "cloudCost is true but there is no costEstimate — a reader cannot know what this will charge them");
      }
      if (/^tier:\s*guided\s*$/m.test(block)) {
        if (!/^cleanup:/m.test(block)) {
          fail(where, null, "cloudCost is true but there are no cleanup steps");
        }
        if (!raw.includes("## Clean up")) {
          fail(where, null, "cloudCost is true but the body has no '## Clean up' section");
        }
      }
    }
  }
}

// ── 4c. Frontmatter must be valid YAML ─────────────────────────────────────
//
// Every other check here reads frontmatter with a regex, which is forgiving:
// a lab whose cleanup step contained nested double quotes passed the linter and
// then crashed the build with "bad indentation of a sequence entry". Parse it
// the way the site does, so a malformed block fails here instead.
for (const dir of ["learn", "labs"]) {
  const full = join(CONTENT, dir);
  if (!existsSync(full)) continue;

  const walk = (d) => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (entry.name.endsWith(".mdx")) {
        try {
          matter(readFileSync(p, "utf8"));
        } catch (error) {
          fail(relative(ROOT, p).replaceAll("\\", "/"), null,
            `frontmatter must be valid YAML — ${error.reason ?? error.message}`);
        }
      }
    }
  };
  walk(full);
}

// ── 5. Message catalogue parity (§4.4a) ─────────────────────────────────────
if (existsSync(MESSAGES)) {
  const en = JSON.parse(readFileSync(join(MESSAGES, "en.json"), "utf8"));
  const ar = JSON.parse(readFileSync(join(MESSAGES, "ar.json"), "utf8"));
  for (const key of Object.keys(en)) {
    if (!(key in ar)) fail("messages/ar.json", null, `missing key "${key}"`);
    else if (!String(ar[key]).trim()) fail("messages/ar.json", null, `empty value for "${key}"`);
  }
  for (const key of Object.keys(ar)) {
    if (!(key in en)) fail("messages/en.json", null, `orphan key "${key}" (not in en)`);
  }
}

// ── Report ──────────────────────────────────────────────────────────────────
console.log(`content lint — ${chapters.length} chapters checked\n`);
if (warnings.length) {
  console.log(`warnings (${warnings.length}):`);
  for (const w of warnings.slice(0, 20)) console.log(`  ${w}`);
  if (warnings.length > 20) console.log(`  … ${warnings.length - 20} more`);
  console.log();
}
if (errors.length) {
  console.log(`errors (${errors.length}):`);
  for (const e of errors.slice(0, 30)) console.log(`  ${e}`);
  if (errors.length > 30) console.log(`  … ${errors.length - 30} more`);
  process.exit(1);
}
console.log("no errors");
