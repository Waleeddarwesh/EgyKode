#!/usr/bin/env python3
"""
Migrate the Cloud-Native-DevOps-Handbook into EgyKode's content structure.

MASTER_PROMPT §6.1: the first job is a migration, not an authoring exercise.
This script restructures existing work — it never generates prose.

Reads : R:/ivolve/Cloud-Native-DevOps-Handbook/*.md   (47 chapters)
Writes: content/learn/<domain>/<slug>.en.mdx          (frontmatter per §6.2)
        content/roadmaps/cloud-devops-engineer.json   (phase -> module map)

Run: python scripts/migrate_handbook.py
"""

from __future__ import annotations

import json
import re
import unicodedata
from dataclasses import dataclass, field
from pathlib import Path

# ── Paths ────────────────────────────────────────────────────────────────────
REPO = Path(__file__).resolve().parents[1]
SOURCE = REPO.parent / "Cloud-Native-DevOps-Handbook"
CONTENT = REPO / "content"

# ── Chapter → (domain, slug) ─────────────────────────────────────────────────
# Domain drives the colour, the hub page and the roadmap node (§5.3).
CHAPTERS: dict[str, tuple[str, str]] = {
    "00": ("platform", "start-here"),
    "01": ("platform", "project-overview"),
    "02": ("platform", "system-architecture"),
    "03": ("platform", "requirements"),
    "04": ("platform", "repository-structure"),
    "05": ("linux", "linux-foundations"),
    "06": ("networking", "networking-fundamentals"),
    "07": ("git", "git-and-github"),
    "08": ("build", "build-tools"),
    "09": ("docker", "docker"),
    "10": ("aws", "aws-overview"),
    "11": ("aws", "vpc"),
    "12": ("aws", "iam"),
    "13": ("terraform", "terraform"),
    "14": ("ansible", "ansible"),
    "15": ("aws", "rds"),
    "16": ("aws", "load-balancers"),
    "17": ("aws", "auto-scaling"),
    "18": ("aws", "secrets-manager"),
    "19": ("kubernetes", "kubernetes"),
    "20": ("kubernetes", "kubeadm"),
    "21": ("helm", "helm"),
    "22": ("kustomize", "kustomize"),
    "23": ("jenkins", "jenkins"),
    "24": ("github-actions", "github-actions"),
    "25": ("aws", "ecr"),
    "26": ("nexus", "nexus-and-artifacts"),
    "27": ("gitops", "gitops"),
    "28": ("argocd", "argocd"),
    "29": ("observability", "observability"),
    "30": ("prometheus", "prometheus"),
    "31": ("grafana", "grafana"),
    "32": ("logging", "logging"),
    "33": ("security", "container-security"),
    "34": ("security", "network-policies"),
    "35": ("kubernetes", "service-mesh"),
    "36": ("aws", "serverless"),
    "37": ("sre", "chaos-engineering"),
    "38": ("cost", "cost-optimization"),
    "39": ("platform-engineering", "platform-engineering"),
    "40": ("sre", "disaster-recovery"),
    "41": ("labs", "hands-on-labs"),
    "42": ("troubleshooting", "troubleshooting"),
    "43": ("glossary", "glossary"),
    "44": ("interview", "interview-prep"),
    "45": ("platform", "architecture-summary"),
    "46": ("platform", "conclusion"),
}

# ── Roadmap: Phase → chapters (§6.0) ────────────────────────────────────────
PHASES: list[dict] = [
    {"id": "orientation", "n": "00", "title": "Orientation",
     "titleAr": "البداية", "chapters": ["00", "01", "02", "03", "04"]},
    {"id": "foundations", "n": "01", "title": "Foundations",
     "titleAr": "الأساسيات", "chapters": ["05", "06", "07"]},
    {"id": "build-and-containers", "n": "02", "title": "Build & Containers",
     "titleAr": "البناء والحاويات", "chapters": ["08", "09"]},
    {"id": "cloud", "n": "03", "title": "Cloud (AWS)",
     "titleAr": "السحابة", "chapters": ["10", "11", "12", "15", "16", "17", "18", "25", "36"]},
    {"id": "iac", "n": "04", "title": "Infrastructure as Code",
     "titleAr": "البنية ككود", "chapters": ["13", "14"]},
    {"id": "kubernetes", "n": "05", "title": "Kubernetes",
     "titleAr": "كوبرنيتس", "chapters": ["19", "20", "21", "22", "35"]},
    {"id": "cicd", "n": "06", "title": "CI/CD",
     "titleAr": "التكامل والتسليم المستمر", "chapters": ["23", "24", "26"]},
    {"id": "gitops", "n": "07", "title": "GitOps",
     "titleAr": "جيت أوبس", "chapters": ["27", "28"]},
    {"id": "observability", "n": "08", "title": "Observability",
     "titleAr": "المراقبة", "chapters": ["29", "30", "31", "32"]},
    {"id": "security", "n": "09", "title": "Security",
     "titleAr": "الأمان", "chapters": ["33", "34"]},
    {"id": "production", "n": "10", "title": "Production & SRE",
     "titleAr": "الإنتاج", "chapters": ["37", "38", "39", "40"]},
]

REFERENCE = ["41", "42", "43", "44", "45", "46"]  # not part of the ordered path

LEVEL_MAP = {
    "beginner": "beginner",
    "intermediate": "intermediate",
    "advanced": "advanced",
    "all levels": "all",
}

# Emoji and other pictographs used as heading decoration in the source.
EMOJI = re.compile(
    "[" "\U0001F000-\U0001FAFF" "\u2190-\u21FF" "\u2600-\u27BF" "\uFE0F" "\u200d" "]+"
)


@dataclass
class Chapter:
    num: str
    domain: str
    slug: str
    title: str
    level: str = "beginner"
    minutes: int = 30
    prereq_nums: list[str] = field(default_factory=list)
    objective: str = ""
    body: str = ""
    phase: str = ""


def strip_emoji(text: str) -> str:
    return EMOJI.sub("", text).strip()


# Titles that name a specific tool where the chapter is broader than it.
TITLE_OVERRIDES = {
    "Build Tools (Maven & Gradle)": "Build Tools",
}


def clean_title(raw: str) -> str:
    """'Chapter 09: Containerization (Docker)' -> 'Containerization (Docker)'."""
    title = re.sub(r"^Chapter\s+\d+:\s*", "", raw).strip()
    return TITLE_OVERRIDES.get(title, title)


def parse_minutes(time_text: str) -> int:
    """'~50 min' -> 50 ; '~12 hours total' -> 720 ; 'reference' -> 10."""
    if m := re.search(r"(\d+)\s*hour", time_text, re.I):
        return int(m.group(1)) * 60
    if m := re.search(r"(\d+)\s*min", time_text, re.I):
        return int(m.group(1))
    return 10


def escape_mdx(body: str) -> str:
    """
    MDX v3 treats `{` as the start of an expression and `<` as the start of a
    JSX tag. The handbook contains Jinja (`{{ }}`), placeholders (`<YOUR_ID>`)
    and generics in prose, all of which would be a parse error.

    Escape both — but only outside fenced and inline code, where they are safe
    and where escaping would corrupt copy-pasted commands.
    """
    out: list[str] = []
    in_fence = False
    for line in body.split("\n"):
        if line.lstrip().startswith("```"):
            in_fence = not in_fence
            out.append(line)
            continue
        if in_fence:
            out.append(line)
            continue

        # Split on inline code so `kubectl get pods` stays untouched.
        parts = re.split(r"(`[^`]*`)", line)
        for i, part in enumerate(parts):
            if part.startswith("`") and part.endswith("`") and len(part) > 1:
                continue
            part = part.replace("{", "\\{").replace("}", "\\}")
            # Leave real markdown autolinks (<https://…>) alone.
            part = re.sub(r"<(?!https?://)", "\\<", part)
            parts[i] = part
        out.append("".join(parts))
    return "\n".join(out)


def parse(path: Path, num: str, domain: str, slug: str) -> Chapter:
    text = path.read_text(encoding="utf-8")
    lines = text.split("\n")

    ch = Chapter(num=num, domain=domain, slug=slug,
                 title=clean_title(lines[0].lstrip("# ").strip()))

    # Metadata blockquote: > **Level** X · **Time** Y · **Prerequisites** Z
    head = "\n".join(lines[:8])
    if m := re.search(r"\*\*Level\*\*\s*([A-Za-z ]+?)\s*(?:·|\|)", head):
        ch.level = LEVEL_MAP.get(m.group(1).strip().lower(), "beginner")
    if m := re.search(r"\*\*Time\*\*\s*([^·|\n]+)", head):
        ch.minutes = parse_minutes(m.group(1))
    if m := re.search(r"\*\*Prerequisites\*\*\s*([^\n]+)", head):
        ch.prereq_nums = re.findall(r"\b(\d{2})\b", m.group(1))
    if m := re.search(r"\*\*After this chapter you can:\*\*\s*([^\n]+)", head):
        ch.objective = m.group(1).strip().rstrip(".")

    # Body starts after the metadata block's closing rule.
    start = 1
    for i, line in enumerate(lines[1:20], start=1):
        if line.strip() == "---":
            start = i + 1
            break
    body = "\n".join(lines[start:]).strip()

    # Strip decorative emoji from headings so anchors and the TOC stay clean.
    body = "\n".join(
        re.sub(r"^(#{2,6})\s*(.*)$", lambda m: f"{m.group(1)} {strip_emoji(m.group(2))}", ln)
        if ln.startswith("#") else ln
        for ln in body.split("\n")
    )

    # Images live beside the handbook; the site serves them from /diagrams.
    # Rewriting here means a re-run does not reintroduce broken paths.
    body = re.sub(
        r"\((?:\.\./)+[^)]*?diagrams/([\w.-]+\.(?:png|jpg|jpeg|svg|webp))\)",
        r"(/diagrams/)",
        body,
    )

    # Handbook cross-links are by filename; rewrite them to platform routes.
    # Locale-less on purpose — middleware supplies the reader's locale.
    num_to_route = {n: f"/learn/{d}/{sl}" for n, (d, sl) in CHAPTERS.items()}
    body = re.sub(
        r"\]\((?:\./)?(\d{2})_[^)]*?\.md(#[^)]*)?\)",
        lambda m: f"]({num_to_route.get(m.group(1), '/learn')}{m.group(2) or ''})",
        body,
    )
    body = re.sub(r"\]\((?:\./)?README\.md(#[^)]*)?\)", lambda m: f"](/learn{m.group(1) or ''})", body)

    # Strip the handbook's filename-based Prev/Next table: the platform
    # renders navigation that understands locale, phase and progress, and two
    # sets of the same control is duplication.
    body = re.sub(
        r"
*(?:---\s*
+)?\|\s*←?\s*\**Previous\**.*?\|\s*
\|[-\s|:]+\|\s*
\|.*?\|\s*
?",
        "
",
        body,
        flags=re.S | re.I,
    )

    ch.body = escape_mdx(body)
    return ch


def yaml_list(items: list[str]) -> str:
    return "[" + ", ".join(items) + "]" if items else "[]"


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"Source handbook not found: {SOURCE}")

    num_to_slug = {n: s for n, (_, s) in CHAPTERS.items()}
    num_to_domain = {n: d for n, (d, _) in CHAPTERS.items()}
    phase_of = {c: p["id"] for p in PHASES for c in p["chapters"]}

    files = {p.name[:2]: p for p in SOURCE.glob("*.md") if p.name[:2].isdigit()}
    written = 0
    index: list[dict] = []

    for num, (domain, slug) in CHAPTERS.items():
        src = files.get(num)
        if not src:
            print(f"  ! missing source for chapter {num}")
            continue

        ch = parse(src, num, domain, slug)
        ch.phase = phase_of.get(num, "reference")

        prereq_slugs = [f'"{num_to_slug[p]}"' for p in ch.prereq_nums if p in num_to_slug]
        related = [
            f'"{num_to_slug[n]}"'
            for n, d in num_to_domain.items()
            if d == domain and n != num
        ][:4]

        frontmatter = f"""---
contentId: {slug}
title: {json.dumps(ch.title)}
description: {json.dumps(ch.objective or ch.title)}
domain: {domain}
level: {ch.level}
type: concept
phase: {ch.phase}
order: {int(num)}
readingTime: {ch.minutes}
prerequisites: {yaml_list(prereq_slugs)}
relatedChapters: {yaml_list(related)}
objectives:
  - {json.dumps(ch.objective or f"Understand {ch.title}")}
status: {"complete" if ch.objective else "partial"}
translationStatus: missing
sourceFile: {json.dumps("Cloud-Native-DevOps-Handbook/" + src.name)}
authors: [waleed]
updated: 2026-08-08
---

"""
        out = CONTENT / "learn" / domain / f"{slug}.en.mdx"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(frontmatter + ch.body + "\n", encoding="utf-8")
        written += 1

        index.append({
            "contentId": slug, "title": ch.title, "domain": domain,
            "level": ch.level, "phase": ch.phase, "order": int(num),
            "readingTime": ch.minutes,
        })

    # Roadmap manifest — the Phase → Module spine of §6.0.
    roadmap = {
        "id": "cloud-devops-engineer",
        "title": "Cloud DevOps Engineer",
        "titleAr": "مهندس Cloud DevOps",
        "description": "From Linux to a production platform you deploy yourself.",
        "descriptionAr": "من لينكس إلى منصة production تنشرها بنفسك.",
        "phases": [
            {
                "id": p["id"], "number": p["n"],
                "title": p["title"], "titleAr": p["titleAr"],
                "chapters": [num_to_slug[c] for c in p["chapters"] if c in num_to_slug],
            }
            for p in PHASES
        ],
        "reference": [num_to_slug[c] for c in REFERENCE if c in num_to_slug],
        "productionProject": {
            "id": "cloud-native-platform",
            "title": "Cloud Native DevOps Platform",
            "titleAr": "منصة Cloud Native DevOps",
            "summary": "A self-managed kubeadm cluster on AWS, provisioned with "
                       "Terraform, configured with Ansible, delivered by Jenkins "
                       "and ArgoCD, observed with Prometheus and Grafana.",
            "repo": "Cloud-Native-DevOps-Platform",
        },
    }
    (CONTENT / "roadmaps").mkdir(parents=True, exist_ok=True)
    (CONTENT / "roadmaps" / "cloud-devops-engineer.json").write_text(
        json.dumps(roadmap, indent=2, ensure_ascii=False), encoding="utf-8")

    (CONTENT / "index.json").write_text(
        json.dumps(sorted(index, key=lambda c: c["order"]), indent=2, ensure_ascii=False),
        encoding="utf-8")

    domains = sorted({c["domain"] for c in index})
    print(f"migrated {written} chapters across {len(domains)} domains")
    print(f"  roadmap: {len(PHASES)} phases + {len(REFERENCE)} reference chapters")
    print(f"  domains: {', '.join(domains)}")


if __name__ == "__main__":
    main()
