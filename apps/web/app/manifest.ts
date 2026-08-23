import type { MetadataRoute } from "next";

import { SITE } from "@/lib/site";

/**
 * Web app manifest — what makes EgyKode installable.
 *
 * This file is deliberately in `apps/web` rather than in `desktop/`. The
 * Windows application is this site, packaged: PWABuilder reads this manifest to
 * produce the MSIX. Putting it here means the desktop client cannot drift from
 * the web client, because there is only one thing to drift from.
 *
 * It also improves the site on its own account — Android and desktop browsers
 * offer "install" from the same file.
 *
 * `dynamic = "force-static"` because the site is exported to plain files; the
 * manifest has to be one of them.
 */
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EgyKode — Learn Cloud & DevOps",
    short_name: "EgyKode",
    description:
      "Learn Cloud and DevOps by building one real production platform. Chapters, hands-on labs, roadmaps and a capstone project — free and open source.",

    // The learner lands on the English home page. `scope` covers the whole site
    // so in-app navigation never escapes to a browser window.
    start_url: "/en/",
    scope: "/",
    id: "/",

    display: "standalone",
    orientation: "any",

    // Both are `--clr-bg` from styles/tokens.css, where dark is the default
    // theme (`:root, [data-theme="dark"]`). A mismatch shows as a flash of the
    // wrong colour on launch, and as a title bar that does not match the app.
    //
    // Deliberately the background rather than the brand green: `theme_color`
    // tints the Windows title bar, and a green bar above a near-black app looks
    // like a rendering fault rather than a brand.
    background_color: "#0f1316",
    theme_color: "#0f1316",

    lang: "en",
    dir: "ltr",
    categories: ["education", "developer", "productivity"],

    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // A maskable icon is padded so Windows and Android can crop it to their
      // own shape without clipping the mark.
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],

    // Jump list entries: right-click the taskbar icon.
    shortcuts: [
      {
        name: "Continue learning",
        short_name: "Learn",
        description: "The ordered curriculum, from Linux to the capstone",
        url: "/en/learn/",
      },
      {
        name: "Labs",
        short_name: "Labs",
        description: "Hands-on labs, challenges and incidents",
        url: "/en/labs/",
      },
      {
        name: "Roadmaps",
        short_name: "Roadmaps",
        description: "Which chapter comes next, and why",
        url: "/en/roadmaps/",
      },
    ],
  } satisfies MetadataRoute.Manifest & { id?: string };
}

/** Kept next to the manifest so the two cannot disagree about the origin. */
export const MANIFEST_ORIGIN = SITE.url;
