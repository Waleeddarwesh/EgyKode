import { CircleDot, GitFork, Layers } from "lucide-react";

/**
 * Where a chapter stands in relation to the capstone.
 *
 * The curriculum necessarily contains three different kinds of chapter, and
 * before this was stated a reader met the RDS chapter — a managed database —
 * while the capstone deliberately runs MySQL as a StatefulSet, with nothing to
 * tell them which they were supposed to build. The honest answer is "neither
 * is wrong, and here is why we chose the other one", which is a better lesson
 * than either chapter alone.
 *
 * `reference` chapters render nothing: they sit outside the ordered path by
 * design, and a badge saying so on a glossary is noise.
 */
export type Role = "core" | "alternative" | "extension" | "reference";

const STYLE: Record<Exclude<Role, "reference">, { icon: typeof CircleDot; tone: string; bg: string }> = {
  core: { icon: CircleDot, tone: "var(--clr-primary-dark)", bg: "var(--clr-primary-bg, transparent)" },
  alternative: { icon: GitFork, tone: "var(--clr-accent)", bg: "transparent" },
  extension: { icon: Layers, tone: "var(--clr-content-secondary)", bg: "transparent" },
};

export function CapstoneRole({
  role,
  why,
  labels,
}: {
  role: Role;
  why?: string;
  labels: { core: string; alternative: string; extension: string };
}) {
  if (role === "reference") return null;
  const { icon: Icon, tone, bg } = STYLE[role];

  return (
    <aside
      className="mb-8 rounded-lg border p-4"
      style={{ borderColor: tone, background: bg }}
      aria-label={labels[role]}
    >
      <p className="flex items-center gap-2 text-sm font-semibold" style={{ color: tone }}>
        <Icon size={15} aria-hidden />
        {labels[role]}
      </p>
      {why && (
        <p className="mt-1.5 text-sm leading-relaxed text-content-secondary">{why}</p>
      )}
    </aside>
  );
}
