#!/usr/bin/env python3
"""
Verify migrated MDX has no unescaped `{`, `}` or `<` outside code.

MDX v3 treats those as expression/JSX syntax, so an unescaped one in prose is a
build failure. This runs before the Next.js build so the error names the file
and line instead of surfacing as an opaque parser stack trace.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INLINE_CODE = re.compile(r"(`[^`]*`)")
HAZARD_BRACE = re.compile(r"(?<!\\)[{}]")
HAZARD_LT = re.compile(r"(?<!\\)<(?!https?://)")


def check(path: Path) -> list[tuple[int, str]]:
    text = path.read_text(encoding="utf-8")
    parts = text.split("---", 2)
    body = parts[2] if len(parts) > 2 else text

    problems: list[tuple[int, str]] = []
    in_fence = False
    for lineno, line in enumerate(body.split("\n"), start=1):
        if line.lstrip().startswith("```"):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        for segment in INLINE_CODE.split(line):
            if segment.startswith("`") and segment.endswith("`") and len(segment) > 1:
                continue
            if HAZARD_BRACE.search(segment) or HAZARD_LT.search(segment):
                problems.append((lineno, segment.strip()[:80]))
                break
    return problems


def main() -> int:
    files = sorted((ROOT / "content").rglob("*.mdx"))
    if not files:
        print("no MDX files found — run scripts/migrate_handbook.py first")
        return 1

    total = 0
    for f in files:
        for lineno, snippet in check(f):
            total += 1
            if total <= 15:
                rel = f.relative_to(ROOT)
                print(f"  {rel}:{lineno}  {snippet}")

    print(f"\nchecked {len(files)} files — {total} unescaped MDX hazard(s)")
    return 1 if total else 0


if __name__ == "__main__":
    sys.exit(main())
