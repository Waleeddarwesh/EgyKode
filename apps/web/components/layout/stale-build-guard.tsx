"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import { BUILD_ID } from "@/lib/build-id";

/**
 * Recover a tab that was left open across a deploy.
 *
 * Symptom, reported and then reproduced from the evidence: the page scrolls
 * but nothing is clickable, and only a refresh helps. Cause: this tab's
 * JavaScript is from an older build, the CDN now serves a newer one, and the
 * client router cannot reconcile the build ids — so navigation silently stops.
 * Nothing throws, which is why the console is clean and it reads as a freeze.
 *
 * The fix is not to make the router cleverer. It is to notice the tab is stale
 * and do a real page load, which is what the reader was doing by hand.
 *
 * Checked when the tab is *re-shown* and on route change rather than on a
 * timer: a background tab polling a CDN forever costs the reader bandwidth to
 * answer a question nobody is asking. Coming back to a tab is exactly the
 * moment the answer might have changed.
 */
export function StaleBuildGuard() {
  const pathname = usePathname();
  const stale = useRef(false);

  useEffect(() => {
    let cancelled = false;

    /**
     * Once the tab is known to be stale, take over link clicks and navigate
     * for real. Reloading the *current* page instead would swallow the click:
     * the reader asked for a chapter and would land back where they started,
     * which is the same frustration in a new costume.
     */
    const onClick = (event: MouseEvent) => {
      if (!stale.current) return;
      // Let the browser handle modified clicks — new tab, download, etc.
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as Element | null)?.closest?.("a");
      const href = anchor?.getAttribute("href");
      if (!anchor || !href || anchor.target === "_blank") return;
      if (!href.startsWith("/")) return; // external links are the browser's job

      event.preventDefault();
      window.location.assign(href);
    };
    document.addEventListener("click", onClick, true);

    const check = async () => {
      if (cancelled || stale.current || document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/build-id.txt", { cache: "no-store" });
        if (!res.ok) return;
        const deployed = (await res.text()).trim();
        // An empty or oversized response means something other than our file
        // answered — a captive portal, an error page. Not evidence of a deploy.
        if (!deployed || deployed.length > 64) return;
        if (deployed !== BUILD_ID) stale.current = true;
      } catch {
        // Offline, or the CDN blinked. Staying quiet is correct: a failed
        // check is not evidence the tab is stale.
      }
    };

    document.addEventListener("visibilitychange", check);
    // One check shortly after mount catches a tab that was already stale when
    // the reader returned to it.
    const t = setTimeout(check, 4000);

    return () => {
      cancelled = true;
      clearTimeout(t);
      document.removeEventListener("visibilitychange", check);
      document.removeEventListener("click", onClick, true);
    };
  }, [pathname]);

  return null;
}
