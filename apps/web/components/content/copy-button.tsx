"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Copy-to-clipboard with confirmation.
 *
 * The label distinguishes a command from a configuration file, because on a
 * DevOps platform those are different actions: one you paste into a shell, the
 * other into an editor.
 */
export function CopyButton({
  text,
  label,
  copiedLabel,
}: {
  text: string;
  label: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
        } catch {
          /* clipboard blocked — the code is still selectable by hand */
        }
      }}
      // aria-live so the confirmation is announced, not only shown.
      className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-content-muted transition-colors hover:bg-surface-active hover:text-content"
    >
      {copied ? (
        <Check size={13} aria-hidden style={{ color: "var(--clr-primary)" }} />
      ) : (
        <Copy size={13} aria-hidden />
      )}
      <span aria-live="polite">{copied ? copiedLabel : label}</span>
    </button>
  );
}
