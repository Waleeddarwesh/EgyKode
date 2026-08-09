#!/usr/bin/env python3
"""
Migrate the NTI lab guides into EgyKode's lab + challenge structure.

MASTER_PROMPT §6.0 and §6.4. Two artifacts come out of each source lab:

  LAB       — objectives, guided steps, and the verification output
  CHALLENGE — the same objectives and success criteria with the steps removed

The challenge is not invented content: it is the lab with its instructions
withheld, which is precisely what §6.0 defines a challenge to be. That is why
the tier costs almost nothing to author and is where competence actually forms.

Run: python scripts/migrate_labs.py
"""
from __future__ import annotations

import json
import re
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
SOURCE = REPO.parent / "NTI" / "NTI Final Project"
CONTENT = REPO / "content" / "labs"

EMOJI = re.compile("[" "\U0001F000-\U0001FAFF" "←-⇿" "☀-➿" "️" "‍" "]+")

# Module directory → the EgyKode domain and roadmap phase it belongs to.
MODULES: dict[str, tuple[str, str]] = {
    "01-Infrastructure-Terraform": ("terraform", "iac"),
    "02-Configuration-Management-Ansible": ("ansible", "iac"),
    "03-Containerization-Docker": ("docker", "build-and-containers"),
    "04-Kubernetes-Orchestration": ("kubernetes", "kubernetes"),
    "05-Helm-Package-Management": ("helm", "kubernetes"),
    "06-CICD-Jenkins-Pipeline": ("jenkins", "cicd"),
    "07-Monitoring-Observability": ("prometheus", "observability"),
    "08-Documentation-Operations": ("sre", "production"),
}

LEVEL_BY_MODULE = {
    "01-Infrastructure-Terraform": "intermediate",
    "02-Configuration-Management-Ansible": "intermediate",
    "03-Containerization-Docker": "beginner",
    "04-Kubernetes-Orchestration": "intermediate",
    "05-Helm-Package-Management": "intermediate",
    "06-CICD-Jenkins-Pipeline": "advanced",
    "07-Monitoring-Observability": "advanced",
    "08-Documentation-Operations": "advanced",
}

# Every lab in this set provisions billable AWS resources.
CLOUD_COST = {"terraform", "ansible", "kubernetes", "helm", "jenkins", "prometheus", "sre"}


def strip_emoji(text: str) -> str:
    return EMOJI.sub("", text).strip()


def escape_mdx(body: str) -> str:
    """Same rules as the chapter migration — MDX treats `{` and `<` as syntax."""
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
        parts = re.split(r"(`[^`]*`)", line)
        for i, part in enumerate(parts):
            if part.startswith("`") and part.endswith("`") and len(part) > 1:
                continue
            part = part.replace("{", "\\{").replace("}", "\\}")
            part = re.sub(r"<(?!https?://)", "\\<", part)
            parts[i] = part
        out.append("".join(parts))
    return "\n".join(out)


def sections(text: str) -> dict[str, str]:
    """Split on level-2 headings, keyed by their emoji-stripped title."""
    found: dict[str, str] = {}
    current = None
    buffer: list[str] = []
    for line in text.split("\n"):
        if line.startswith("## "):
            if current:
                found[current] = "\n".join(buffer).strip()
            current = strip_emoji(line[3:]).lower()
            buffer = []
        elif current:
            buffer.append(line)
    if current:
        found[current] = "\n".join(buffer).strip()
    return found


def bullets(block: str, limit: int = 8) -> list[str]:
    items: list[str] = []
    for line in block.split("\n"):
        m = re.match(r"^\s*[-*]\s+(.+)$", line)
        if not m:
            m = re.match(r"^\s*\d+\.\s+(.+)$", line)
        if m:
            text = re.sub(r"\*\*([^*]+)\*\*", r"\1", m.group(1)).strip()
            text = re.sub(r"`([^`]*)`", r"\1", text)
            if 8 < len(text) < 180:
                items.append(text)
        if len(items) >= limit:
            break
    return items


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"NTI source not found: {SOURCE}")

    CONTENT.mkdir(parents=True, exist_ok=True)
    index: list[dict] = []
    written = 0

    for module_dir in sorted(SOURCE.iterdir()):
        if not module_dir.is_dir() or module_dir.name not in MODULES:
            continue
        domain, phase = MODULES[module_dir.name]
        level = LEVEL_BY_MODULE[module_dir.name]

        for lab_dir in sorted(module_dir.iterdir()):
            readme = lab_dir / "README.md"
            if not readme.is_file():
                continue

            text = readme.read_text(encoding="utf-8")
            lines = text.split("\n")
            raw_title = strip_emoji(lines[0].lstrip("# "))

            m = re.match(r"Lab\s*(\d+)\s*:\s*(.+)", raw_title, re.I)
            number = int(m.group(1)) if m else 0
            title = (m.group(2) if m else raw_title).strip()
            slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")[:60]
            lab_id = f"lab-{number:02d}-{slug}"

            parts = sections(text)
            objectives = bullets(parts.get("objectives", ""), 6)
            steps_block = parts.get("step-by-step execution guide", "")
            verify_block = parts.get("verification & expected terminal output", "")
            concept_block = parts.get('concept & architecture ("what & why")', "")

            step_titles = [
                strip_emoji(s[4:]).strip()
                for s in steps_block.split("\n")
                if s.startswith("### ")
            ]

            # Success criteria: the objectives if present, otherwise the step
            # titles. Never invented.
            criteria = objectives or step_titles[:6]
            estimate = max(20, min(90, 15 + len(step_titles) * 8))

            front = f"""---
labId: {lab_id}
title: {json.dumps(title)}
description: {json.dumps(objectives[0] if objectives else title)}
domain: {domain}
level: {level}
type: lab
phase: {phase}
order: {number}
tier: guided
estimatedMinutes: {estimate}
cloudCost: {"true" if domain in CLOUD_COST else "false"}
successCriteria:
{chr(10).join(f"  - {json.dumps(c)}" for c in criteria) or "  []"}
challengeId: {lab_id}-challenge
sourceFile: {json.dumps(str(readme.relative_to(SOURCE.parent)).replace(chr(92), "/"))}
authors: [waleed]
updated: 2026-08-09
---

"""
            body_parts = []
            if concept_block:
                body_parts.append("## What you are building\n\n" + concept_block)
            if steps_block:
                body_parts.append("## Steps\n\n" + steps_block)
            if verify_block:
                body_parts.append("## Verify it worked\n\n" + verify_block)

            (CONTENT / f"{lab_id}.en.mdx").write_text(
                front + escape_mdx("\n\n".join(body_parts)) + "\n", encoding="utf-8"
            )

            # ── The challenge: same goal, no instructions ────────────────────
            challenge_front = f"""---
labId: {lab_id}-challenge
title: {json.dumps(title)}
description: {json.dumps("Do it without the walkthrough.")}
domain: {domain}
level: {level}
type: lab
phase: {phase}
order: {number}
tier: challenge
estimatedMinutes: {max(15, estimate // 2)}
cloudCost: {"true" if domain in CLOUD_COST else "false"}
successCriteria:
{chr(10).join(f"  - {json.dumps(c)}" for c in criteria) or "  []"}
guidedLabId: {lab_id}
authors: [waleed]
updated: 2026-08-09
---

"""
            # The goal is an instruction, not an explanation. Reusing the
            # concept section put a definition of VPC where the task should be
            # — and the learner already read that definition in the guided lab.
            challenge_body = (
                f"## The goal\n\n"
                f"Build **{title}** yourself, starting from an empty directory, "
                "without following the guided steps.\n\n"
                "Everything you need is in the criteria above. Work down them one "
                "at a time, and verify each before moving to the next.\n\n"
                "## Rules\n\n"
                "- Do not open the guided lab until you have genuinely tried.\n"
                "- When something fails, read the error before you search. "
                "The error message is the lesson.\n"
                "- Tear down anything billable as soon as you finish.\n\n"
                "## If you get stuck\n\n"
                "The guided lab is one click away at the bottom of this page. "
                "Using it is not failure — coming back and repeating the challenge "
                "afterwards is the point.\n"
            )
            (CONTENT / f"{lab_id}-challenge.en.mdx").write_text(
                challenge_front + escape_mdx(challenge_body), encoding="utf-8"
            )

            written += 2
            index.append(
                {
                    "labId": lab_id,
                    "title": title,
                    "domain": domain,
                    "phase": phase,
                    "level": level,
                    "order": number,
                    "estimatedMinutes": estimate,
                    "criteria": len(criteria),
                }
            )

    (REPO / "content" / "labs-index.json").write_text(
        json.dumps(sorted(index, key=lambda x: x["order"]), indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    print(f"migrated {written // 2} labs -> {written} files (lab + challenge each)")
    domains = sorted({i["domain"] for i in index})
    print(f"  domains: {', '.join(domains)}")
    thin = [i["labId"] for i in index if i["criteria"] == 0]
    if thin:
        print(f"  ! no success criteria found for: {', '.join(thin)}")


if __name__ == "__main__":
    main()
