import fs from "node:fs";
// Run: node scripts/audit-verifiers.mjs
// Checks every scenario verifier for the failure modes that recurred while
// building them - chiefly checks that pass without checking anything.
const dirs = fs.readdirSync("killercoda").filter((f) => fs.statSync("killercoda/" + f).isDirectory());
const findings = [];
const add = (sev, file, msg) => findings.push({ sev, file, msg });

for (const d of dirs) {
  for (const f of fs.readdirSync(`killercoda/${d}`).filter((f) => f.startsWith("verify") && f.endsWith(".sh"))) {
    const p = `killercoda/${d}/${f}`;
    const s = fs.readFileSync(p, "utf8");
    const lines = s.split("\n");

    // 1. A guarded parse that turns a failed measurement into a skipped check.
    lines.forEach((l, i) => {
      if (/^\s*if \[ -n "\$[A-Z_]+" \] && \[ -n "\$[A-Z_]+" \]; then/.test(l))
        add("HIGH", `${p}:${i + 1}`, "conditional guard may skip a comparison when parsing fails");
    });

    // 2. date -d on an ISO timestamp with nanoseconds.
    if (/date -[ud]* *-d "\$/.test(s) && !/sed 's\/\\\.\.\*Z\$\/\/|tr 'T' ' '/.test(s))
      add("HIGH", p, "date -d on a raw timestamp - busybox and GNU both reject nanoseconds");

    // 3. Dependencies that are not guaranteed on every image.
    for (const dep of ["python3", "jq"]) {
      if (new RegExp(`\b${dep}\b`).test(s)) {
        const setup = fs.existsSync(`killercoda/${d}/setup.sh`) ? fs.readFileSync(`killercoda/${d}/setup.sh`, "utf8") : "";
        if (!setup.includes(dep)) add("MED", p, `uses ${dep} but setup.sh never installs or checks for it`);
      }
    }

    // 4. Checks made only of absences - they pass on an untouched environment.
    const asserts = lines.filter((l) => /^\s*\[ /.test(l) || /grep -q/.test(l));
    const absence = asserts.filter((l) => /-z |! -f |-eq 0 |grep -q.*&& \{/.test(l)).length;
    if (asserts.length > 0 && absence === asserts.length && asserts.length >= 2)
      add("HIGH", p, "every assertion is about absence - would pass on an environment where nothing was ever built");

    // 5. curl with no timeout can hang a verify indefinitely.
    //
    // A `curl` inside an echoed hint is text for the reader to type, not a
    // request this script makes, and flagging it produced the only two
    // findings this audit ever reported that were not worth acting on. Two
    // false positives is enough to teach people to skim the output.
    lines.forEach((l, i) => {
      // Anything inside quotes is a message, a URL or a hint — never the
      // invocation itself, which always starts unquoted. Stripping quoted
      // spans leaves the flags intact, since `--max-time` is never quoted
      // away from the command it belongs to.
      const executable = l.replace(/"[^"]*"|'[^']*'/g, "");
      if (/curl /.test(executable) && !/--max-time/.test(executable) && !/^\s*#/.test(l))
        add("LOW", `${p}:${i + 1}`, "curl without --max-time");
    });

    // 6. Exit code read after a pipe reports the last command in the pipeline.
    lines.forEach((l, i) => {
      if (/\| *(head|tail|grep)[^|]*$/.test(l) && lines[i + 1] && /\$\?/.test(lines[i + 1]))
        add("HIGH", `${p}:${i + 1}`, "$? after a pipe reads the last command, not the one being tested");
    });

    if (!/^#!/.test(s)) add("HIGH", p, "no shebang");
    if (!/exit 0/.test(s)) add("MED", p, "never exits 0 explicitly");
  }
}

const by = { HIGH: [], MED: [], LOW: [] };
findings.forEach((f) => by[f.sev].push(f));
console.log(`Audited ${dirs.length} scenarios\n`);
for (const sev of ["HIGH", "MED", "LOW"]) {
  console.log(`${sev}: ${by[sev].length}`);
  by[sev].slice(0, 14).forEach((f) => console.log(`   ${f.file}\n      ${f.msg}`));
  if (by[sev].length > 14) console.log(`   ... and ${by[sev].length - 14} more`);
  console.log("");
}
