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
