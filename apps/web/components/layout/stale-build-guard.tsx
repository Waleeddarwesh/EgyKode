"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Recover a tab that was left open across a deploy.
 *
 * Symptom, reported and then traced from the evidence: the page scrolls but
 * nothing is clickable, and only a refresh helps. Cause: this tab's JavaScript
 * is from an older build, the CDN now serves a newer one, and Next's client
 * router cannot reconcile the build ids — so navigation silently stops.
 * Nothing throws, which is why the console is clean and it reads as a freeze.
 *
 * The fix is not a cleverer router. It is to notice the tab is stale and do
 * the real page load the reader was doing by hand.
 *
 * The baseline is recorded by this tab on mount rather than compiled in. A
 * generated module holding the id meant `typecheck` imported a file that only
 * the build step writes, and CI runs typecheck without it — so the check
 * failed on a file that is correctly gitignored. Reading it once at runtime
 * removes the generated artifact and that ordering bug together.
 */
export function StaleBuildGuard() {
  const pathname = usePathname();
  const loaded = useRef<string | null>(null);
  const stale = useRef(false);

  useEffect(() => {
    let cancelled = false;

    /**
     * Once the tab is known to be stale, take over link clicks and navigate
     * for real. Reloading the *current* page would swallow the click: the
     * reader asked for a chapter and would land back where they started, which
     * is the same frustration in a new costume.
     */
    const onClick = (event: MouseEvent) => {
      if (!stale.current || event.defaultPrevented || event.button !== 0) return;
      // Leave modified clicks alone — new tab, download, and so on.
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as Element | null)?.closest?.("a");
      const href = anchor?.getAttribute("href");
      if (!anchor || !href || anchor.target === "_blank") return;
      if (!href.startsWith("/")) return; // external links are the browser's job

      event.preventDefault();
      window.location.assign(href);
    };

    const check = async () => {
      if (cancelled || stale.current || document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/build-id.txt", { cache: "no-store" });
        if (!res.ok) return;
        const deployed = (await res.text()).trim();
        // Empty or oversized means something other than our file answered — a
        // captive portal, an error page. Not evidence of a deploy.
        if (!deployed || deployed.length > 64) return;

        if (loaded.current === null) {
          loaded.current = deployed; // what was deployed when this tab started
          return;
        }
        if (deployed !== loaded.current) stale.current = true;
      } catch {
        // Offline, or the CDN blinked. A failed check is not evidence the tab
        // is stale, so stay quiet.
      }
    };

    document.addEventListener("click", onClick, true);
    // Checked when the tab is re-shown rather than on a timer: a background tab
    // polling a CDN forever spends the reader's bandwidth answering a question
    // nobody asked, and returning to a tab is exactly when the answer may have
    // changed. The one delayed check establishes the baseline without
    // competing with everything else loading.
    document.addEventListener("visibilitychange", check);
    const timer = setTimeout(check, 4000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", check);
      document.removeEventListener("click", onClick, true);
    };
  }, [pathname]);

  return null;
}
