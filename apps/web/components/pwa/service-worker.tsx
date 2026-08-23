"use client";

import { useEffect } from "react";

/**
 * Registers the service worker.
 *
 * Kept deliberately small and side-effect-only. Everything about *what* is
 * cached lives in `public/sw.js`; this component decides only whether to
 * register at all.
 *
 * Not registered in development: a stale worker serving yesterday's build is a
 * confusing way to lose an afternoon, and the offline behaviour is worth testing
 * against a real export rather than the dev server.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    // After load, so registration never competes with the first paint.
    const register = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // A failed registration must never break the page. The site works
        // exactly as before, just without offline support.
      });
    };

    if (document.readyState === "complete") register();
    else {
      window.addEventListener("load", register);
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
