// Run: node scripts/audit-step-criteria.mjs
// Lists steps that declare no criterion. Such a step can only ever be marked
// by hand, so a lab can show "all criteria met" with steps still unticked.
// Some are legitimately explanatory - a table, a summary, a reference - so this
// is a list to triage rather than a list of bugs.
import fs from "node:fs";
const files = fs.readdirSync("content/labs").filter((f) => f.endsWith(".en.mdx"));
let labs = 0, orphanTotal = 0;
const worst = [];
for (const f of files) {
  const raw = fs.readFileSync("content/labs/" + f, "utf8");
  const steps = [...raw.matchAll(/<LabStep n=\{(\d+)\}([^>]*)>/g)];
  if (!steps.length) continue;
  const critCount = (raw.match(/^  - (text:|")/gm) || []).length;
  labs++;
  const orphans = steps.filter((m) => !/criterion=/.test(m[2])).map((m) => Number(m[1]));
  if (orphans.length) {
    orphanTotal += orphans.length;
    worst.push({ lab: f.replace(".en.mdx", ""), steps: steps.length, orphans });
  }
}
worst.sort((a, b) => b.orphans.length - a.orphans.length);
console.log(`${labs} labs with steps; ${worst.length} have steps owning no criterion (${orphanTotal} steps total)\n`);
worst.slice(0, 18).forEach((w) => console.log(`  ${w.lab}\n     ${w.orphans.length}/${w.steps} steps unowned: ${w.orphans.join(", ")}`));
if (worst.length > 18) console.log(`  ... and ${worst.length - 18} more labs`);
