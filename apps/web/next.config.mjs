import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  /**
   * `next dev` and `next build` both write to `.next` by default, so running a
   * verification build while a dev server is up rewrites the asset hashes under
   * it: the running server keeps serving HTML that references CSS files the
   * build has already replaced, every stylesheet 404s, and the page renders as
   * unstyled HTML with a full-viewport logo.
   *
   * Verification builds set NEXT_DIST_DIR to an isolated directory so they
   * cannot disturb a dev server. Deploys leave it unset and get `.next`.
   */
  distDir: process.env.NEXT_DIST_DIR || ".next",
  /**
   * `NEXT_OUTPUT=export` produces a folder of plain files for a CDN — no Node
   * server, no per-request compute, and therefore no compute bill. Left unset
   * for local development, where middleware and on-demand rendering are
   * convenient.
   */
  ...(process.env.NEXT_OUTPUT === "export"
    ? {
        output: "export",
        // Every route becomes a directory with index.html, so a plain object
        // store serves it without rewrite rules.
        trailingSlash: true,
      }
    : {}),
  /**
   * The floating "N" badge is Next's own dev overlay. It never ships to
   * production, but it sits on top of the mobile bottom navigation while
   * developing and covers the first tab, so it is turned off.
   *
   * `buildActivity` / `appIsrStatus` were deprecated in Next 15.2; on 15.5 the
   * whole indicator is disabled with `false`.
   */
  devIndicators: false,
  // Content lives at the repo root, outside apps/web — tracing it keeps the
  // standalone build able to read the MDX at build time.
  // fileURLToPath, not URL.pathname: the latter returns "/R:/..." on Windows.
  outputFileTracingRoot: join(dirname(fileURLToPath(import.meta.url)), "..", ".."),
  images: {
    /**
     * Always off, not only in export mode.
     *
     * The optimiser is a server route (`/_next/image`). A static export has no
     * server, so it must be off there — otherwise every `next/image` renders a
     * src pointing at an endpoint that does not exist and the image is broken
     * in production while working perfectly in `next start`.
     *
     * It used to be `NEXT_OUTPUT === "export"`, which left the optimiser on
     * for `build:verify`. That build runs in server mode, so on a cold cache
     * the optimiser had to generate every image on demand — and under eight
     * parallel Playwright workers it could not, so the author-photo test
     * failed on every cold run while passing warm. CI is always cold, so that
     * was a scheduled failure.
     *
     * Turning it off everywhere means the verification build serves images the
     * same way production does, which is what a verification build is for. The
     * cost is that `next dev` no longer resizes, which matters for nothing
     * here: the only remote images are author avatars, already small.
     *
     * This lives here rather than in the export block above because a second
     * `images` key in the same object literal silently overwrote it, which is
     * exactly how the author photos shipped broken once before.
     */
    unoptimized: true,
    // Imported author avatars only. Anything else must be mirrored locally.
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
  async redirects() {
    // /build was renamed to /projects. URLs are stable; a moved page gets a
    // permanent redirect forever (§12.2).
    return [
      { source: "/:locale(en|ar)/build", destination: "/:locale/projects", permanent: true },
      { source: "/:locale(en|ar)/build/:slug", destination: "/:locale/projects/:slug", permanent: true },
    ];
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
