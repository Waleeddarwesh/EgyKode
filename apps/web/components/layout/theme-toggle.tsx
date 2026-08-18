"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Pref = "system" | "light" | "dark";

const ORDER: Pref[] = ["system", "light", "dark"];
const ICON = { system: Monitor, light: Sun, dark: Moon } as const;

/**
 * The colour each option takes when it is the active one.
 *
 * All three were --clr-primary-dark, so the sun was a dark green shape whose
 * thin rays disappeared against the light surface behind it. Colouring them
 * apart also means the current theme is readable at a glance rather than by
 * comparing three similar icons for which has a background.
 */
const ACTIVE_COLOUR = {
  system: "var(--clr-primary-dark)",
  light: "var(--clr-sun)",
  dark: "var(--clr-moon)",
} as const;

/**
 * Theme switch: system, light, dark, all three visible.
 *
 * This was one button that cycled through the three, showing only the icon of
 * the current preference. Two problems, both reported: you could not tell what
 * the control did without clicking it, and on the default preference it showed
 * a monitor glyph while the site was plainly dark — so the button and the page
 * disagreed about the theme.
 *
 * Showing every option costs about 50px of topbar and removes the guessing:
 * the current state is the highlighted segment, and the other two say what
 * else is available. It also makes "system" meaningful rather than mysterious
 * — it sits beside the manual choices it defers to.
 *
 * State lives on <html data-theme>, so switching is a CSS variable swap with
 * no React re-render (§4.1).
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

  function choose(next: Pref) {
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

  return (
    <div
      role="radiogroup"
      aria-label={labels.action}
      className="flex h-9 items-center gap-0.5 rounded-md border p-0.5"
    >
      {ORDER.map((option) => {
        const Icon = ICON[option];
        // Before mount the stored preference is unknown, so nothing is marked
        // active — picking one would flash the wrong segment on every load.
        const active = mounted && pref === option;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={labels[option]}
            title={labels[option]}
            onClick={() => choose(option)}
            className="flex h-8 w-8 items-center justify-center rounded transition-colors"
            style={
              active
                ? { background: "var(--clr-surface-active)", color: ACTIVE_COLOUR[option] }
                : { color: "var(--clr-text-muted)" }
            }
          >
            <Icon size={15} aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
