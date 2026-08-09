#!/usr/bin/env python3
"""
Rewrite handbook-internal links to platform routes.

The source chapters cross-link by filename (`19_Kubernetes.md`), and those
survived the migration as dead links — 177 of them, including the
Previous/Up/Next navigation table at the foot of every chapter.

Targets are locale-less (`/learn/<domain>/<slug>`). The middleware adds the
locale from the reader's cookie or Accept-Language, so an Arabic reader
following a cross-link stays in Arabic instead of being thrown to English.

Run: python scripts/fix_chapter_links.py
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content" / "learn"

# Same mapping the chapter migration uses.
from migrate_handbook import CHAPTERS  # noqa: E402

NUM_TO_ROUTE = {
    num: f"/learn/{domain}/{slug}" for num, (domain, slug) in CHAPTERS.items()
}

# `NN_Anything.md` -> the chapter route it refers to.
CHAPTER_LINK = re.compile(r"\]\((?:\./)?(\d{2})_[^)]*?\.md(#[^)]*)?\)")
# `README.md` is the handbook index -> the curriculum page.
INDEX_LINK = re.compile(r"\]\((?:\./)?README\.md(#[^)]*)?\)")
# ADRs live in the reference repository, not on the platform yet.
ADR_LINK = re.compile(r"\]\((?:\.\./)+[^)]*?/docs/adr/([^)]+?)\.md\)")

REPO = "https://github.com/Waleeddarwesh/Cloud-Native-DevOps-Platform"


def main() -> None:
    total = 0
    unresolved: list[str] = []
    files = 0

    for path in sorted(CONTENT.rglob("*.mdx")):
        text = path.read_text(encoding="utf-8")
        original = text

        def chapter_sub(match: re.Match[str]) -> str:
            num, anchor = match.group(1), match.group(2) or ""
            route = NUM_TO_ROUTE.get(num)
            if not route:
                unresolved.append(f"{path.name}: chapter {num}")
                return match.group(0)
            return f"]({route}{anchor})"

        text = CHAPTER_LINK.sub(chapter_sub, text)
        text = INDEX_LINK.sub(lambda m: f"](/learn{m.group(1) or ''})", text)
        text = ADR_LINK.sub(lambda m: f"]({REPO}/blob/main/docs/adr/{m.group(1)}.md)", text)

        if text != original:
            total += len(CHAPTER_LINK.findall(original)) + len(INDEX_LINK.findall(original))
            path.write_text(text, encoding="utf-8")
            files += 1

    print(f"rewrote links in {files} file(s) — {total} chapter/index links")
    remaining = sum(
        len(re.findall(r"\]\([^)]*\.md[^)]*\)", p.read_text(encoding="utf-8")))
        for p in CONTENT.rglob("*.mdx")
    )
    print(f"remaining .md links: {remaining}")
    for u in unresolved[:10]:
        print(f"  ! unresolved {u}")


if __name__ == "__main__":
    main()
