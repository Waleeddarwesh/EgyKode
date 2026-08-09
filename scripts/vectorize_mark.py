#!/usr/bin/env python3
"""
Vectorise the EK monogram from the raster artwork into a clean SVG path.

The mark is a polygonal, straight-edged construction, so a contour trace plus
Douglas-Peucker simplification recovers its true vertices — this is a faithful
trace, not an approximation drawn by eye.

    python scripts/vectorize_mark.py apps/web/public/brand/mark-dark-source.png

Writes apps/web/public/brand/mark.svg and prints the path data.
"""
from __future__ import annotations

import colorsys
import sys
from collections import deque
from pathlib import Path

from PIL import Image

TOLERANCE = 1.6      # px; edges are straight, so this only removes stair-stepping
VIEW_W = 100.0       # normalised viewBox width


def build_mask(path: str) -> tuple[list[list[bool]], int, int]:
    im = Image.open(path).convert("RGB")
    w, h = im.size
    px = im.load()
    mask = [[False] * w for _ in range(h)]
    for y in range(h):
        row = mask[y]
        for x in range(w):
            r, g, b = px[x, y]
            _, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            row[x] = s > 0.45 and v > 0.4
    return mask, w, h


def components(mask: list[list[bool]], w: int, h: int) -> list[set[tuple[int, int]]]:
    seen = [[False] * w for _ in range(h)]
    out: list[set[tuple[int, int]]] = []
    for sy in range(h):
        for sx in range(w):
            if not mask[sy][sx] or seen[sy][sx]:
                continue
            blob: set[tuple[int, int]] = set()
            q = deque([(sx, sy)])
            seen[sy][sx] = True
            while q:
                x, y = q.popleft()
                blob.add((x, y))
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and mask[ny][nx] and not seen[ny][nx]:
                        seen[ny][nx] = True
                        q.append((nx, ny))
            if len(blob) > 200:          # ignore antialiasing specks
                out.append(blob)
    return out


def trace(blob: set[tuple[int, int]]) -> list[tuple[int, int]]:
    """Moore-neighbour boundary trace, returning the outer contour in order."""
    start = min(blob, key=lambda p: (p[1], p[0]))
    nbrs = [(1, 0), (1, 1), (0, 1), (-1, 1), (-1, 0), (-1, -1), (0, -1), (1, -1)]
    contour = [start]
    cur, back = start, 4
    guard = 0
    while guard < 400_000:
        guard += 1
        found = False
        for i in range(8):
            d = (back + 1 + i) % 8
            nx, ny = cur[0] + nbrs[d][0], cur[1] + nbrs[d][1]
            if (nx, ny) in blob:
                back = (d + 4 + 2) % 8
                cur = (nx, ny)
                found = True
                break
        if not found:
            break
        if cur == start and len(contour) > 2:
            break
        contour.append(cur)
    return contour


def perp(p, a, b) -> float:
    (px_, py_), (ax, ay), (bx, by) = p, a, b
    dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0:
        return ((px_ - ax) ** 2 + (py_ - ay) ** 2) ** 0.5
    return abs(dy * px_ - dx * py_ + bx * ay - by * ax) / (dx * dx + dy * dy) ** 0.5


def simplify(pts: list[tuple[int, int]], tol: float) -> list[tuple[int, int]]:
    if len(pts) < 3:
        return pts
    dmax, idx = 0.0, 0
    for i in range(1, len(pts) - 1):
        d = perp(pts[i], pts[0], pts[-1])
        if d > dmax:
            dmax, idx = d, i
    if dmax > tol:
        return simplify(pts[: idx + 1], tol)[:-1] + simplify(pts[idx:], tol)
    return [pts[0], pts[-1]]


def main(src: str) -> None:
    mask, w, h = build_mask(src)
    blobs = components(mask, w, h)
    print(f"found {len(blobs)} shape component(s)")

    all_pts = [p for b in blobs for p in b]
    x0 = min(p[0] for p in all_pts)
    x1 = max(p[0] for p in all_pts)
    y0 = min(p[1] for p in all_pts)
    y1 = max(p[1] for p in all_pts)
    bw, bh = x1 - x0, y1 - y0
    scale = VIEW_W / bw
    view_h = round(bh * scale, 2)

    paths: list[str] = []
    for blob in sorted(blobs, key=len, reverse=True):
        contour = trace(blob)
        pts = simplify(contour, TOLERANCE)
        if len(pts) < 3:
            continue
        norm = [
            (round((x - x0) * scale, 2), round((y - y0) * scale, 2)) for x, y in pts
        ]
        d = "M" + " L".join(f"{x} {y}" for x, y in norm) + " Z"
        paths.append(d)
        print(f"  component: {len(blob):6d}px -> {len(pts):3d} vertices")

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {VIEW_W:g} {view_h:g}" fill="currentColor" role="img" aria-label="EgyKode">
{chr(10).join(f'  <path d="{d}"/>' for d in paths)}
</svg>
"""
    out = Path(src).parent / "mark.svg"
    out.write_text(svg, encoding="utf-8")
    print(f"\nwrote {out}  viewBox 0 0 {VIEW_W:g} {view_h:g}  ({len(svg)} bytes)")


if __name__ == "__main__":
    sys.setrecursionlimit(10000)
    main(sys.argv[1] if len(sys.argv) > 1 else "apps/web/public/brand/mark-dark-source.png")
