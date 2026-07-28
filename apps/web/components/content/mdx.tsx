import { AlertTriangle, Info, Lightbulb, ShieldAlert, Terminal as TerminalIcon } from "lucide-react";
import type { ReactNode } from "react";

import { CopyButton } from "./copy-button";

/** Recursively pull the plain text out of a React tree (for copy + analysis). */
function textOf(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (typeof node === "object" && "props" in node) {
    // @ts-expect-error — children is untyped on a generic element
    return textOf(node.props?.children);
  }
  return "";
}

/**
 * Commands that destroy or cost money.
 *
 * A learner following along in a terminal will paste whatever is in the box.
 * These get a visible warning band rather than a footnote, because §11.5 says
 * destructive commands carry a callout and a footnote is not one.
 */
const DESTRUCTIVE =
  /\b(terraform\s+destroy|rm\s+-rf|kubectl\s+delete|docker\s+system\s+prune|drop\s+(database|table)|aws\s+\w+\s+delete-|--force|mkfs|dd\s+if=)/i;

const SHELL_LANGS = new Set(["bash", "sh", "shell", "zsh", "console", "terminal"]);

export interface MdxLabels {
  copy: string;
  copyCommand: string;
  copied: string;
  terminal: string;
  destructive: string;
  destructiveBody: string;
}

/**
 * Code block chrome.
 *
 * rehype-pretty-code emits figure > pre > code with the language on the code
 * element. This wraps that in a titled frame with a copy button — a bare <pre>
 * reads as documentation; a framed terminal reads as something you run.
 */
function Pre({ children, labels }: { children?: ReactNode; labels: MdxLabels }) {
  const code = textOf(children).replace(/\n$/, "");

  // The language lives on the nested <code> element's className.
  let language = "";
  if (children && typeof children === "object" && "props" in children) {
    // @ts-expect-error — reading the compiled child's props
    const raw = children.props?.className ?? children.props?.["data-language"] ?? "";
    const match = String(raw).match(/language-(\w+)/);
    language = match?.[1] ?? String(raw || "");
  }

  const isShell = SHELL_LANGS.has(language.toLowerCase());
  const destructive = isShell && DESTRUCTIVE.test(code);

  return (
    <div
      className="my-6 overflow-hidden rounded-lg border"
      style={destructive ? { borderColor: "var(--clr-danger)" } : undefined}
    >
      {destructive && (
        <p
          className="flex items-start gap-2 px-4 py-2.5 text-xs font-medium"
          style={{ background: "var(--clr-danger-bg)", color: "var(--clr-text)" }}
        >
          <ShieldAlert size={14} className="mt-px shrink-0" aria-hidden />
          <span>
            <strong>{labels.destructive}</strong> — {labels.destructiveBody}
          </span>
        </p>
      )}

      <div
        className="flex items-center gap-2 border-b px-3 py-1.5"
        style={{ background: "var(--clr-bg-secondary)" }}
      >
        {isShell && <TerminalIcon size={13} className="shrink-0 text-content-muted" aria-hidden />}
        <span className="font-mono text-[11px] uppercase tracking-wide text-content-muted">
          {isShell ? labels.terminal : language || "code"}
        </span>
        <span className="ms-auto">
          <CopyButton
            text={code}
            label={isShell ? labels.copyCommand : labels.copy}
            copiedLabel={labels.copied}
          />
        </span>
      </div>

      {/* dir is pinned in globals.css — code is never mirrored, even in RTL.
          tabIndex makes the horizontal scroll reachable by keyboard: a region
          that scrolls but cannot be focused is unusable without a mouse. */}
      <pre
        tabIndex={0}
        role="region"
        aria-label={isShell ? labels.terminal : `${language || "code"} snippet`}
        className="!my-0 !rounded-none !border-0"
      >
        {children}
      </pre>
    </div>
  );
}

/**
 * Blockquotes that open with a keyword become callouts.
 *
 * The migrated handbook writes emphasis as `> **Note** …`, which markdown
 * renders as an indistinguishable grey bar. Promoting them to typed callouts
 * gives the page the visual hierarchy it was written to have, without editing
 * 47 files.
 */
const CALLOUTS = {
  note: { icon: Info, colour: "var(--clr-info)", bg: "var(--clr-info-bg)" },
  tip: { icon: Lightbulb, colour: "var(--clr-primary)", bg: "var(--clr-success-bg)" },
  warning: { icon: AlertTriangle, colour: "var(--clr-warning)", bg: "var(--clr-warning-bg)" },
  danger: { icon: ShieldAlert, colour: "var(--clr-danger)", bg: "var(--clr-danger-bg)" },
} as const;

const KEYWORDS: Record<string, keyof typeof CALLOUTS> = {
  note: "note",
  "n.b.": "note",
  remember: "note",
  tip: "tip",
  "in practice": "tip",
  "why this matters": "tip",
  warning: "warning",
  caution: "warning",
  important: "warning",
  careful: "warning",
  danger: "danger",
  never: "danger",
  "do not": "danger",
};

function Blockquote({ children }: { children?: ReactNode }) {
  const text = textOf(children).trim().toLowerCase();
  const hit = Object.entries(KEYWORDS).find(([word]) => text.startsWith(word));
  const kind = hit ? CALLOUTS[hit[1]] : null;

  if (!kind) return <blockquote>{children}</blockquote>;

  const Icon = kind.icon;
  return (
    <div
      className="my-6 flex gap-3 rounded-lg border-s-[3px] p-4"
      style={{ background: kind.bg, borderInlineStartColor: kind.colour }}
    >
      <Icon size={17} className="mt-0.5 shrink-0" style={{ color: kind.colour }} aria-hidden />
      <div className="callout-body min-w-0 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
        {children}
      </div>
    </div>
  );
}

/** External links leave the site — say so, and do it safely. */
function Anchor({ href, children }: { href?: string; children?: ReactNode }) {
  const external = href?.startsWith("http");
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
    </a>
  );
}

/** Wide tables must scroll inside their own box, never the page (§12.6). */
function Table({ children }: { children?: ReactNode }) {
  return (
    <div className="my-6 overflow-x-auto rounded-lg border">
      <table className="!my-0 !border-0">{children}</table>
    </div>
  );
}

export function mdxComponents(labels: MdxLabels) {
  return {
    pre: (props: { children?: ReactNode }) => <Pre {...props} labels={labels} />,
    blockquote: Blockquote,
    a: Anchor,
    table: Table,
  };
}
