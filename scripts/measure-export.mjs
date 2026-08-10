/**
 * What the site actually costs a visitor.
 *
 * Raw byte counts overstate reality — every CDN serves these compressed — so
 * this reports the transfer size a browser really receives, plus the render
 * metrics that decide whether a page *feels* fast.
 *
 * Run: node scripts/measure-export.mjs [exportDir]
 */
import { readFileSync, statSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { gzipSync, brotliCompressSync, constants } from "node:zlib";

const DIR = process.argv[2] ?? "apps/web/.next-export";

const PAGES = [
  ["home", "en/index.html"],
  ["topics", "en/topics/index.html"],
  ["questions", "en/prepare/questions/index.html"],
  ["chapter", "en/learn/kubernetes/kubernetes/index.html"],
  ["roadmap", "en/roadmaps/cloud-devops-engineer/index.html"],
  ["labs", "en/labs/index.html"],
];

const kb = (n) => `${(n / 1024).toFixed(1)}kB`;

console.log("page          raw        gzip       brotli");
console.log("-".repeat(52));
let worst = null;
for (const [name, path] of PAGES) {
  try {
    const buf = readFileSync(join(DIR, path));
    const br = brotliCompressSync(buf, {
      params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
    });
    const gz = gzipSync(buf, { level: 9 });
    console.log(
      `${name.padEnd(12)} ${kb(buf.length).padEnd(10)} ${kb(gz.length).padEnd(10)} ${kb(br.length)}`,
    );
    if (!worst || br.length > worst.size) worst = { name, size: br.length };
  } catch {
    console.log(`${name.padEnd(12)} (missing)`);
  }
}

// The JS a visitor downloads once, shared by every page.
const staticDir = join(DIR, "_next", "static");
let js = 0;
let css = 0;
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (entry.name.endsWith(".js")) js += statSync(p).size;
    else if (entry.name.endsWith(".css")) css += statSync(p).size;
  }
};
try {
  walk(staticDir);
  console.log(`\nshipped assets: ${kb(js)} JS, ${kb(css)} CSS (raw, all routes combined)`);
} catch {}

console.log(`\nheaviest page over the wire: ${worst?.name} at ${kb(worst?.size ?? 0)} brotli`);
