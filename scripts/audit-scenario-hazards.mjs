// Run: node scripts/audit-scenario-hazards.mjs
//
// Checks every Killercoda scenario for the specific failure classes this
// project has actually been bitten by. Each rule exists because something
// shipped or nearly shipped with it - none of them are style opinions.
//
// Deliberately narrow. A checker that flags plausible-looking things trains
// people to skim it, and a skimmed audit is no audit.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = join(ROOT, "killercoda");

/** Strip comment lines so a rule does not fire on prose describing itself. */
const code = (body) =>
  body
    .split("\n")
    .filter((l) => !/^\s*#/.test(l))
    .join("\n");

const RULES = [
  {
    id: "unpinned-image",
    // localstack/localstack:latest stopped starting without a licence token
    // partway through this work, and read as a broken environment.
    why: "an unpinned image changes under the scenario; localstack:latest already did",
    test: (body) =>
      [...code(body).matchAll(/\b((?:[\w.-]+\/)*[\w.-]+):latest\b/g)]
        .map((m) => m[1])
        // jenkins/jenkins:lts floats deliberately - pinning it breaks plugin
        // installation outright - and these are pulled to be scanned, where
        // the point is whatever is current.
        .filter((n) => !/^(aquasec\/trivy|jenkins\/jenkins)$/.test(n)),
  },
  {
    id: "exit-after-pipe",
    // $? after a pipeline is the last command's status, not the interesting
    // one. Caught on a probe this session; in a verifier it would lie.
    why: "$? after a pipe reads the last command's status, not the one being tested",
    test: (body) =>
      code(body)
        .split("\n")
        .filter((l) => {
          if (!/\$\?/.test(l) || /PIPESTATUS/.test(l)) return false;
          // A real pipe, not || and not |&. The first version of this rule
          // matched `[ $? -eq 7 ] || fail ...` in a shipped verifier, which is
          // correct code - and two false positives is all it takes to teach
          // people to skim the output.
          const segments = l.split(";");
          return segments.some((seg, i) => {
            if (!/\$\?/.test(seg)) return false;
            const before = segments.slice(0, i + 1).join(";");
            const upToStatus = before.slice(0, before.indexOf("$?"));
            return /(^|[^|])\|([^|&]|$)/.test(upToStatus);
          });
        })
        .map((l) => l.trim().slice(0, 70)),
  },
  {
    id: "jenkins-stale-fact",
    // Both were true when written and are not now.
    why: "Jenkins needs Java 21+ and rotated its signing key in December 2025",
    test: (body) =>
      code(body)
        .split("\n")
        // Fetching or installing the stale thing, not mentioning it. Several
        // scenarios name the 2023 key and Java 17 precisely because they are
        // what broke - flagging that would punish the correct teaching.
        .filter((l) =>
          /(get_url|curl|wget|url:|apt-get install|dnf install|rpm --import|name:)/.test(l) &&
          /jenkins\.io-2023\.key|openjdk-17|java-17-amazon/.test(l))
        .map((l) => l.trim().slice(0, 70)),
  },
  {
    id: "apt-awscli-unguarded",
    // Ubuntu 24.04 has no awscli package at all.
    why: "Ubuntu 24.04 dropped the awscli package; an apt-only install leaves aws absent",
    test: (body) => {
      const c = code(body);
      if (!/apt-get install[^\n]*\bawscli\b/.test(c)) return [];
      return /awscli-exe-linux/.test(c) ? [] : ["apt install with no fallback"];
    },
  },
  {
    id: "db-auth-from-inside",
    // The official Postgres image trusts 127.0.0.1, so a wrong password is
    // accepted from inside the container - a proof that proves nothing.
    why: "postgres trusts 127.0.0.1 from inside its own container; a password proof there is meaningless",
    test: (body) =>
      code(body)
        .split("\n")
        .filter((l) => /docker exec/.test(l) && /psql/.test(l) && /PGPASSWORD/.test(l))
        .map((l) => l.trim().slice(0, 70)),
  },
];

if (!existsSync(DIR)) {
  console.log("No killercoda/ directory.");
  process.exit(0);
}

const scenarios = readdirSync(DIR).filter((f) => statSync(join(DIR, f)).isDirectory());
let hits = 0;

for (const name of scenarios) {
  const dir = join(DIR, name);
  const found = [];
  for (const file of readdirSync(dir).filter((f) => /\.(sh|md)$/.test(f))) {
    const body = readFileSync(join(dir, file), "utf8");
    for (const rule of RULES) {
      const m = rule.test(body);
      if (m.length) found.push({ file, rule, m: [...new Set(m)] });
    }
  }
  if (found.length) {
    hits += found.length;
    console.log(`\n  killercoda/${name}`);
    for (const f of found) {
      console.log(`     ${f.file}  [${f.rule.id}]  ${f.m.slice(0, 3).join(", ")}`);
      console.log(`        ${f.rule.why}`);
    }
  }
}

console.log(
  hits === 0
    ? `\n${scenarios.length} scenario(s) checked against ${RULES.length} known hazards — none found.`
    : `\n${scenarios.length} scenario(s) checked: ${hits} hazard(s).`,
);
process.exit(hits === 0 ? 0 : 1);
