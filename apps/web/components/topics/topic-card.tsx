"use client";

import { ArrowRight, BookOpen, FolderGit2, Map as MapIcon, Wrench } from "lucide-react";
import Link from "next/link";

/**
 * A topic card — a *client* component on purpose.
 *
 * The topics page hands its cards to FilterBar, which is a client component.
 * When a **server**-rendered element crosses that boundary, React serialises
 * the whole rendered tree into the inline RSC payload, so every card shipped
 * twice: once as HTML and once as script. With 74 topics that was ~700 KB of
 * inline payload — two thirds of a 1.05 MB page.
 *
 * A client component element serialises as a module reference plus its props,
 * so the markup is emitted once as HTML and the payload carries only the data.
 * Same output, a fraction of the bytes.
 *
 * Everything it needs is a plain, already-localised prop: no `t()`, no content
 * lookups, nothing that would drag the content layer into the browser bundle.
 */
export interface TopicCardData {
  id: string;
  href: string;
  title: string;
  areaTitle: string;
  colour: string;
  level: string;
  counts: { chapters: number; labs: number; roadmaps: number; projects: number };
  /** Pre-formatted so number formatting stays on the server. */
  formatted: { chapters: string; labs: string; roadmaps: string; projects: string };
  labels: { chapters: string; labs: string; roadmaps: string; projects: string };
}

export function TopicCard({ topic }: { topic: TopicCardData }) {
  const metrics = [
    { n: topic.counts.chapters, value: topic.formatted.chapters, label: topic.labels.chapters, Icon: BookOpen },
    { n: topic.counts.labs, value: topic.formatted.labs, label: topic.labels.labs, Icon: Wrench },
    { n: topic.counts.roadmaps, value: topic.formatted.roadmaps, label: topic.labels.roadmaps, Icon: MapIcon },
    { n: topic.counts.projects, value: topic.formatted.projects, label: topic.labels.projects, Icon: FolderGit2 },
  ];

  return (
    <Link href={topic.href} className="card card-lift group flex h-full flex-col p-5">
      <span className="flex items-start gap-2.5">
        <span
          className="mt-1 h-4 w-1 shrink-0 rounded-full"
          style={{ background: topic.colour }}
          aria-hidden
        />
        <span className="min-w-0 flex-1">
          <span className="block font-display font-semibold text-content">{topic.title}</span>
          <span className="mt-0.5 block text-xs text-content-muted">{topic.areaTitle}</span>
        </span>
        <ArrowRight
          size={14}
          aria-hidden
          className="icon-directional mt-1 shrink-0 text-content-muted opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100"
        />
      </span>

      {/* Labelled counts. "8 4 Advanced" makes the reader decode it. */}
      <span className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-4 text-xs text-content-secondary">
        {metrics
          .filter((metric) => metric.n > 0)
          .map(({ value, label, Icon }) => (
            <span key={label} className="inline-flex items-center gap-1">
              <Icon size={12} aria-hidden />
              <span className="tabular-nums">{value}</span>
              {label}
            </span>
          ))}
        <span className="ms-auto text-content-muted">{topic.level}</span>
      </span>
    </Link>
  );
}
