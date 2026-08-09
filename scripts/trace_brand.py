#!/usr/bin/env python3
"""
Measure the EK monogram's geometry from the raster artwork.

The mark is a straight-line geometric construction (verticals and 45° diagonals),
so scanline measurement recovers its vertices exactly — which is what lets the
SVG be a faithful vector rather than a hand-drawn approximation.

Run from the directory containing the artwork:
    python EgyKode/scripts/trace_brand.py logo.png
"""
from __future__ import annotations

import colorsys
import sys

from PIL import Image


def main(path: str) -> None:
    im = Image.open(path).convert("RGB")
    w, h = im.size
    px = im.load()

    def green(x: int, y: int) -> bool:
        r, g, b = px[x, y]
        _, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
        return s > 0.45 and v > 0.4

    xs, ys = [], []
    for y in range(0, h, 2):
        for x in range(0, w, 2):
            if green(x, y):
                xs.append(x)
                ys.append(y)

    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    W, H = x1 - x0, y1 - y0
    print(f"bbox x[{x0},{x1}] y[{y0},{y1}]  w={W} h={H}  aspect={W/H:.4f}")

    def runs(y: int) -> list[tuple[int, int]]:
        out: list[tuple[int, int]] = []
        start = None
        for x in range(x0 - 3, x1 + 4):
            g = green(x, y) if 0 <= x < w else False
            if g and start is None:
                start = x
            elif not g and start is not None:
                out.append((start - x0, x - 1 - x0))
                start = None
        if start is not None:
            out.append((start - x0, x1 - x0))
        return out

    print("\nscanlines, normalised to a 100-wide box:")
    for frac in [0.01, 0.05, 0.10, 0.16, 0.22, 0.28, 0.34, 0.40, 0.46,
                 0.52, 0.58, 0.64, 0.72, 0.80, 0.88, 0.96, 0.995]:
        y = int(y0 + H * frac)
        norm = [(round(a / W * 100, 1), round(b / W * 100, 1)) for a, b in runs(y)]
        print(f"  y={round(frac * H / W * 100, 1):6.1f}  runs={norm}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "logo.png")
