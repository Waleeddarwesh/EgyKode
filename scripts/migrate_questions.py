#!/usr/bin/env python3
"""
Extract the question bank from the chapter corpus.

41 of the 47 chapters end with an "Interview Questions" section, levelled
Beginner / Intermediate / Senior / Principal. Those are real questions with
real answers, already written — so this is an extraction, not an authoring
exercise (§6.1).

They are NOT called "Popular Questions": nothing here has usage data yet, and
calling curated content popular would be a claim the platform cannot support.

Writes content/questions/<domain>.json — one file per domain, each question
linked to the chapter it came from.

Run: python scripts/migrate_questions.py
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEARN = ROOT / "content" / "learn"
OUT = ROOT / "content" / "questions"

# The source uses seniority headings; the platform uses its own level scale.
LEVEL_MAP = {
    "beginner": "beginner",
    "intermediate": "intermediate",
    "senior": "advanced",
    "principal/architect": "expert",
    "principal": "expert",
    "architect": "expert",
}

# A scenario question describes a situation to work through; a conceptual one
# asks what something is. The distinction drives how they are presented.
SCENARIO = re.compile(
    r"\b(walk me through|you (are|have|notice)|during a|your |a customer|"
    r"how would you (debug|fix|handle|resolve)|what happens (when|if)|"
    r"is (stuck|failing|pending)|troubleshoot)",
    re.I,
)


def frontmatter(raw: str) -> tuple[dict, str]:
    match = re.match(r"^---\r?\n([\s\S]*?)\r?\n---", raw)
    if not match:
        return {}, raw
    data: dict[str, str] = {}
    for line in match.group(1).split("\n"):
        kv = re.match(r"^(\w+):\s*(.*)$", line)
        if kv:
            data[kv.group(1)] = kv.group(2).strip().strip('"')
    return data, raw[match.end():]


def unescape(text: str) -> str:
    """Undo the MDX escaping applied during the chapter migration."""
    return text.replace("\\{", "{").replace("\\}", "}").replace("\\<", "<")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    by_domain: dict[str, list[dict]] = {}
    total = 0
    skipped: list[str] = []

    for path in sorted(LEARN.rglob("*.en.mdx")):
        meta, body = frontmatter(path.read_text(encoding="utf-8"))
        if not meta.get("contentId"):
            continue

        section = re.search(r"^## Interview Questions\s*$(.*?)(?=^## |\Z)", body,
                            re.M | re.S)
        if not section:
            skipped.append(meta["contentId"])
            continue

        level = "intermediate"
        for line in section.group(1).split("\n"):
            heading = re.match(r"^### (.+)$", line.strip())
            if heading:
                level = LEVEL_MAP.get(heading.group(1).strip().lower(), "intermediate")
                continue

            pair = re.match(r"^\*\*Q:\s*(.+?)\*\*\s*$", line.strip())
            if pair:
                current_q = unescape(pair.group(1)).strip()
                continue

            answer = re.match(r"^A:\s*(.+)$", line.strip())
            if answer and "current_q" in dir() and current_q:
                text = unescape(answer.group(1)).strip()
                qid = re.sub(r"[^a-z0-9]+", "-", current_q.lower()).strip("-")[:70]
                by_domain.setdefault(meta["domain"], []).append({
                    "id": f"{meta['contentId']}-{qid}"[:90],
                    "question": current_q,
                    "answer": text,
                    "level": level,
                    "kind": "scenario" if SCENARIO.search(current_q) else "conceptual",
                    "domain": meta["domain"],
                    "chapter": meta["contentId"],
                    "chapterTitle": meta.get("title", ""),
                })
                total += 1
                current_q = ""

    for domain, questions in sorted(by_domain.items()):
        (OUT / f"{domain}.json").write_text(
            json.dumps(questions, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )

    levels: dict[str, int] = {}
    kinds: dict[str, int] = {}
    for qs in by_domain.values():
        for q in qs:
            levels[q["level"]] = levels.get(q["level"], 0) + 1
            kinds[q["kind"]] = kinds.get(q["kind"], 0) + 1

    print(f"extracted {total} questions across {len(by_domain)} domains")
    print(f"  by level: {dict(sorted(levels.items()))}")
    print(f"  by kind : {dict(sorted(kinds.items()))}")
    if skipped:
        print(f"  no question section in {len(skipped)} chapter(s): {', '.join(skipped[:6])}")


if __name__ == "__main__":
    main()
