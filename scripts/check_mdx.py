#!/usr/bin/env python3
"""
Verify MDX has no unescaped `{`, `}` or `<` outside code and outside JSX.

MDX v3 treats those as expression/JSX syntax, so an unescaped one in prose is a
build failure. This runs before the Next.js build so the error names the file
and line instead of surfacing as an opaque parser stack trace.

Lab content deliberately uses components — `<LabStep>`, `<Why>`, `<Expect>` and
the rest — so a rule that rejected every `<` would make the step format
unauthorable. Instead, tags for components that are actually registered in the
MDX map are allowed and everything else is still rejected.

The allowed set is read from `mdx.tsx` rather than listed here. A second list
would drift, and the failure it produced would be the confusing kind: a
component that works in the browser but fails lint, or worse, a typo like
`<Expct>` that lint waves through and MDX renders as an unknown element.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INLINE_CODE = re.compile(r"(`[^`]*`)")
HAZARD_BRACE = re.compile(r"(?<!\\)[{}]")
HAZARD_LT = re.compile(r"(?<!\\)<(?!https?://)")

MDX_MAP = ROOT / "apps" / "web" / "components" / "content" / "mdx.tsx"


def known_components() -> set[str]:
    """Capitalised keys of the object `mdxComponents` returns."""
    if not MDX_MAP.exists():
        return set()
    text = MDX_MAP.read_text(encoding="utf-8")
    start = text.find("export function mdxComponents")
    if start == -1:
        return set()
    block = text[start:]
    # `LabStep: (props…) =>` and the shorthand `Why,` forms both appear.
    named = set(re.findall(r"^\s{4}([A-Z]\w+)\s*[,:]", block, re.MULTILINE))
    return named


KNOWN = known_components()

# A line that is nothing but an opening or closing tag of a known component.
# Attributes may contain braces and quotes; the tag must close on the same line.
def is_component_line(line: str) -> bool:
    stripped = line.strip()
    if not stripped.startswith("<"):
        return False
    match = re.match(r"^</?([A-Z]\w*)\b", stripped)
    if not match or match.group(1) not in KNOWN:
        return False
    return stripped.endswith(">")


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
        if is_component_line(line):
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

    known = ", ".join(sorted(KNOWN)) or "none found"
    print(f"\nchecked {len(files)} files - {total} unescaped MDX hazard(s)")
    print(f"components allowed in prose: {known}")
    return 1 if total else 0


if __name__ == "__main__":
    sys.exit(main())
