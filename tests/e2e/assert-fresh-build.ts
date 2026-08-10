import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Fail the suite when it would test a stale build.
 *
 * The E2E server is deliberately served from an isolated dist directory so the
 * suite never disturbs a dev server. The cost of that isolation is that
 * `npm run build` writes somewhere else entirely — so it is possible to change
 * content, rebuild, run the suite, and watch it pass against the previous
 * build. Nothing reports an error; the tests simply assert things that are
 * still true of the old output.
 *
 * That produced three wrong conclusions in one session, including "the tables
 * are fixed" and "the labs render correctly" when neither build under test
 * contained the change. A silent false pass is worse than a failure, so this
 * turns it into a loud one.
 */
const DIST = join("apps", "web", process.env.NEXT_DIST_DIR ?? ".next-verify");

/** Sources whose change should invalidate the build under test. */
const WATCHED = ["content", join("apps", "web", "app"), join("apps", "web", "components"),
  join("apps", "web", "lib"), join("apps", "web", "styles")];

const SKIP = new Set(["node_modules", ".next", ".next-verify", ".next-export", ".git"]);

function newestMtime(dir: string): number {
  let newest = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const path = join(dir, entry.name);
    const mtime = entry.isDirectory() ? newestMtime(path) : statSync(path).mtimeMs;
    if (mtime > newest) newest = mtime;
  }
  return newest;
}

export default function assertFreshBuild(): void {
  const manifest = join(DIST, "prerender-manifest.json");
  if (!existsSync(manifest)) {
    throw new Error(
      `No build at ${DIST}. Run: npm run build:verify\n` +
        `(the E2E server reads ${DIST}, not the default .next)`,
    );
  }

  const built = statSync(manifest).mtimeMs;
  const stale = WATCHED.filter((dir) => existsSync(dir) && newestMtime(dir) > built);

  if (stale.length) {
    throw new Error(
      `${DIST} is older than ${stale.join(", ")} — the suite would test the ` +
        `previous build and pass without exercising your change.\n` +
        `Run: npm run build:verify`,
    );
  }
}
