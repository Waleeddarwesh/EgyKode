/**
 * Production build for verification, into an isolated output directory.
 *
 * `next dev` and `next build` both default to `.next`. Building while a dev
 * server is running rewrites the asset hashes underneath it, so the running
 * server serves HTML referencing CSS that no longer exists — every stylesheet
 * 404s and the site renders as unstyled HTML. That is a confusing failure to
 * debug, because the page still returns 200.
 *
 * NEXT_DIST_DIR is read by next.config.mjs. Deploys do not set it and build to
 * `.next` as normal; this script and the Playwright web server use
 * `.next-verify`.
 *
 * Set here rather than inline in package.json because `VAR=x cmd` is not
 * portable to Windows shells.
 *
 * Run: node scripts/build-verify.mjs
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = process.env.NEXT_DIST_DIR ?? ".next-verify";

for (const step of [["tokens"], ["topics"], ["search"]]) {
  const result = spawnSync("npm", ["run", ...step], {
    cwd: ROOT,
    stdio: "inherit",
    shell: true,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const build = spawnSync("npx", ["next", "build"], {
  cwd: join(ROOT, "apps", "web"),
  stdio: "inherit",
  shell: true,
  env: { ...process.env, NEXT_DIST_DIR: DIST },
});

process.exit(build.status ?? 1);
