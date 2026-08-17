"use client";

/**
 * The platform as it currently stands, and where it is going.
 *
 * This is not a second drawing of the capstone. The rows are the capstone
 * components already declared by the chapters (`capstonePhase` /
 * `capstoneComponent`), projected through what the learner has actually
 * demonstrated — so it cannot drift from the mapping the way a hand-drawn
 * diagram would.
 *
 * Progressive on purpose. Showing a beginner who has finished Linux the whole
 * Terraform → EKS → Jenkins → Argo CD → Prometheus stack is discouraging and
 * teaches nothing; showing only what they have built loses the sense of
 * direction. So: what stands, then a faded line for what comes.
 */
export interface ArchLayer {
  /** The build phase this layer corresponds to. */
  phaseId: string;
  label: string;
  /** Component names, from the chapters' capstone mappings. */
  nodes: string[];
}

export function ArchitectureState({
  layers,
  reached,
  labels,
}: {
  layers: ArchLayer[];
  /** Phase ids the learner has at least practised. */
  reached: Set<string>;
  labels: { built: string; ahead: string; nothingYet: string };
}) {
  const standing = layers.filter((l) => reached.has(l.phaseId));
  const ahead = layers.filter((l) => !reached.has(l.phaseId));

  return (
    <div className="mt-4 border-t pt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">
        {labels.built}
      </p>

      {standing.length === 0 ? (
        <p className="mt-2 text-sm text-content-muted">{labels.nothingYet}</p>
      ) : (
        <ol className="mt-2 space-y-1">
          {standing.map((layer, i) => (
            <li key={layer.phaseId} className="text-sm">
              <span className="font-mono text-xs text-content-muted">
                {i === 0 ? "  " : "↓ "}
              </span>
              <span className="font-medium text-content">{layer.label}</span>
              <span className="text-content-secondary">
                {" — "}
                {layer.nodes.join(" · ")}
              </span>
            </li>
          ))}
        </ol>
      )}

      {/* Direction without detail. Enough to see where this is heading; not so
          much that the remaining nine phases read as a wall. */}
      {ahead.length > 0 && (
        <p className="mt-3 text-xs text-content-muted">
          <span className="font-semibold uppercase tracking-wide">{labels.ahead}</span>{" "}
          {ahead.map((l) => l.label).join(" → ")}
        </p>
      )}
    </div>
  );
}
