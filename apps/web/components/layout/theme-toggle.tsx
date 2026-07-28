"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Pref = "system" | "light" | "dark";

const ORDER: Pref[] = ["system", "light", "dark"];
const ICON = { system: Monitor, light: Sun, dark: Moon } as const;

/**
 * Cycles system → light → dark. State lives on <html data-theme>, so the flip
 * is a CSS variable swap with no React re-render (§4.1).
 */
export function ThemeToggle({ labels }: { labels: Record<Pref | "action", string> }) {
  const [pref, setPref] = useState<Pref>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = document.documentElement.getAttribute("data-theme-pref") as Pref | null;
    setPref(stored ?? "system");
    setMounted(true);
  }, []);

  // When the preference is "system", follow the OS live.
  //
  // `mounted` is load-bearing, not cosmetic: `pref` starts as "system" on the
  // first render, so without this guard the effect would apply the OS theme
  // before the stored preference had been read — silently overwriting a user's
  // explicit choice on every reload.
  useEffect(() => {
    if (!mounted || pref !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const apply = () =>
      document.documentElement.setAttribute("data-theme", media.matches ? "light" : "dark");
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [pref, mounted]);

  function cycle() {
    const next = ORDER[(ORDER.indexOf(pref) + 1) % ORDER.length]!;
    setPref(next);
    const root = document.documentElement;
    root.setAttribute("data-theme-pref", next);
    const resolved =
      next === "system"
        ? window.matchMedia("(prefers-color-scheme: light)").matches
          ? "light"
          : "dark"
        : next;
    root.setAttribute("data-theme", resolved);
    root.style.colorScheme = resolved;
    try {
      if (next === "system") localStorage.removeItem("egykode_theme");
      else localStorage.setItem("egykode_theme", next);
    } catch {
      /* storage unavailable — the in-memory preference still applies */
    }
  }

  const Icon = ICON[pref];

  return (
    <button
      type="button"
      onClick={cycle}
      title={labels.action}
      aria-label={`${labels.action}: ${labels[pref]}`}
      className="btn btn-outline h-9 w-9 !px-0"
    >
      {/* Render a stable icon until mounted so SSR and client agree. */}
      <Icon size={17} aria-hidden className={mounted ? "" : "opacity-0"} />
    </button>
  );
}
