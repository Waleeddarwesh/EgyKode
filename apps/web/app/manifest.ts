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

/**
 * The manifest spec moves faster than Next's type for it.
 *
 * `id` and `edge_side_panel` are both real, shipped members that
 * `MetadataRoute.Manifest` does not describe yet. Widening here — rather than
 * casting at the return — keeps the excess-property check switched on for
 * everything else, so a typo in a member Next *does* know about is still an
 * error rather than a silently ignored key in the published JSON.
 */
type EgyKodeManifest = MetadataRoute.Manifest & {
  id?: string;
  edge_side_panel?: { preferred_width?: number };
};

export default function manifest(): EgyKodeManifest {
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

    // A fallback chain, most app-like first. If a browser does not support
    // `standalone` it drops to `minimal-ui` (a slim toolbar) before falling all
    // the way back to a browser tab, which is what plain `display` would give.
    display_override: ["standalone", "minimal-ui"],

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

    /**
     * Reuse the open window instead of spawning another.
     *
     * A learner following a link from a chapter to a lab should land in the
     * window they are already reading in. Without this, every deep link opens a
     * new window and the taskbar fills up with copies of the same app.
     */
    launch_handler: { client_mode: "navigate-existing" },

    /**
     * Deep links: `web+egykode://en/learn/docker/docker/` opens the installed
     * app at that page.
     *
     * The brief asked for `egykode://`. The web platform reserves bare custom
     * schemes and requires a `web+` prefix for anything a manifest registers,
     * so this is `web+egykode` — the same capability under the name the
     * platform allows, resolving to the same routes.
     */
    protocol_handlers: [{ protocol: "web+egykode", url: "/%s" }],

    /**
     * Pinnable beside another window in Edge's side panel.
     *
     * Worth declaring for this app specifically: the natural way to use EgyKode
     * is with the chapter open next to a terminal or an editor, and the side
     * panel is that layout without any work from us.
     */
    edge_side_panel: { preferred_width: 480 },

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
  } satisfies EgyKodeManifest;
}

/**
 * Manifest members deliberately NOT declared, and why.
 *
 * PWABuilder lists every optional member as an opportunity, and it is tempting
 * to add all of them to raise a score. A manifest member is a claim about what
 * the application does, and declaring one the app does not implement produces
 * an OS integration that appears and then does nothing — a "New note" entry
 * that opens a reading app, a share target that discards what you shared.
 *
 *   file_handlers    EgyKode opens no files. Registering as a handler would put
 *                    it in "Open with" for types it cannot read.
 *   share_target     There is nothing to receive a share into.
 *   widgets          No widget surface exists.
 *   note_taking      Notes are a possible future desktop feature, not a built
 *                    one. Declaring it now advertises a menu entry that leads
 *                    nowhere.
 *   tabbed           `display_override: ["tabbed"]` is experimental, and the
 *                    navigation here is a sidebar, not tabs.
 *   scope_extensions EgyKode is one origin. There is nothing to extend to.
 *   iarc_rating_id   Requires a certificate issued by a ratings body. Partner
 *                    Center collects the age rating through its own
 *                    questionnaire; an invented ID here would be a false claim.
 *   related_applications / prefer_related_applications
 *                    These point at the published Store listing. Add them after
 *                    the first submission is live, when the Store ID exists —
 *                    pointing at an unpublished app sends installers to a 404.
 *   screenshots      Needs real captures of the installed app. The shot list is
 *                    in desktop/store/listing.md; add them here once taken, so
 *                    the install prompt shows the app rather than describing it.
 */

/** Kept next to the manifest so the two cannot disagree about the origin. */
export const MANIFEST_ORIGIN = SITE.url;
