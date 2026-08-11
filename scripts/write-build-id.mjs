#!/usr/bin/env node
/**
 * Stamp the deploy so a tab can tell when it has gone stale.
 *
 * A page left open across a deploy runs JavaScript from the previous build
 * while the CDN serves the new one. Next's client router then fetches an RSC
 * payload whose build id does not match, and navigation stops working:
 * scrolling still scrolls, links do nothing, and only a refresh recovers. This
 * site deployed eleven times in one day, so that window is not theoretical —
 * it produced a report of a "frozen" page, and earlier the same mismatch
 * dumped a reader onto /en/labs/index.txt.
 *
 * One artifact, not two. An earlier version also generated a TypeScript module
 * holding the same id, which `typecheck` then imported — and CI runs typecheck
 * without the build step that writes it, so the type check failed on a file
 * that is correctly gitignored. The guard now records its own baseline on
 * mount instead, which removes the generated module and that whole class of
 * ordering bug with it.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// The commit is the truthful identity in CI. Locally there is no deploy to be
// stale against, so a timestamp is enough.
const id = (process.env.GITHUB_SHA ?? `local-${Date.now()}`).slice(0, 40);

const publicDir = join("apps", "web", "public");
mkdirSync(publicDir, { recursive: true });
writeFileSync(join(publicDir, "build-id.txt"), id, "utf8");

console.log(`build id: ${id}`);
