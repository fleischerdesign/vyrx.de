#!/usr/bin/env python3
"""Build the VYRX mark set from the one delivered source.

`vyrx-primary-black.svg` is the artwork as it came from the brand sheet: four letters on one line, cap
height 137, the wordmark 353..1179 on the design grid. Nothing here draws a letter - every file below is an
*arrangement* of those same five paths (X is two of them, because its upper right arm is a separate piece by
design). The delivered letter spacing is never recomputed: every letter in a line moves by the same amount,
so the spacing of the source survives by construction.

Four arrangements, because one wordmark cannot do four jobs:

  wordmark   one line       wide places: header, landing, share card
  two-line   VY over RX     square places from ~48 px: app icon, apple-touch
  mark-v     the V alone    16 px and below, where four letters are noise - measured: 25 ink pixels in a
                            16x16 tile against 30 for a single letter
  tile       black square   the container that keeps the mark visible on a light *and* a dark tab bar; a
                            free-standing black glyph disappears in a dark browser

Everything is positioned on the box origin (0,0). `README.md` says where the measurements come from; the
assertions below are the ones that caught a lop-sided tile while this was being written.

Run it with ImageMagick on the path (`magick`). Nothing here talks to the network.
"""
from __future__ import annotations

import re
import subprocess
from pathlib import Path

HERE = Path(__file__).parent
PUBLIC = HERE.parent.parent / "public"
SOURCE = HERE / "vyrx-primary-black.svg"

CAP_HEIGHT = 137.0
PATH_TOP = 138.0  # the top of the capitals on the design grid; the content box starts there
# Read from the source's paths: the left edge and the width of each letter on the design grid.
PATH_LEFT = {"V": 353.0, "Y": 581.5, "R": 805.0, "X": 978.0}
WIDTH = {"V": 213.0, "Y": 191.5, "R": 156.0, "X": 201.0}
LINE_GAP = 60.0  # for the square uses: the block becomes 420 x 334 (1.26), which fits a round mask best
PADDING = 20.0
SECOND_LINE_INDENT = 23.0  # (line one 420 - line two 374) / 2: the second line is centred, not flush left

PATHS = re.findall(r'<path d="([^"]+)"', SOURCE.read_text())
PIECES = {"V": [0], "Y": [1], "R": [2], "X": [3, 4]}


def span(word: str) -> float:
    """How wide a word is, in the source's own spacing."""
    return PATH_LEFT[word[-1]] + WIDTH[word[-1]] - PATH_LEFT[word[0]]


def word_letters(word: str, dx: float = 0.0, dy: float = 0.0) -> str:
    """`word` moved so that its first letter starts at `dx` and its capitals start at `dy`.

    Both axes are normalised: the paths carry the design grid inside them (x from 353, y from 138), so a
    transform that moved only x left the letters hanging out of the bottom of the box they fill. The
    verification at the end of this file is what found that.
    """
    shift_x = dx - PATH_LEFT[word[0]]
    piece = "".join(f'<path d="{PATHS[i]}"/>' for name in word for i in PIECES[name])
    return f'<g transform="translate({shift_x:.2f} {dy - PATH_TOP:.2f})">{piece}</g>'


TWO_LINE_WIDTH = max(span("VY"), SECOND_LINE_INDENT + span("RX"))
TWO_LINE_HEIGHT = CAP_HEIGHT * 2 + LINE_GAP

ARRANGEMENTS: dict[str, tuple[str, float, float]] = {
    "wordmark": (word_letters("VYRX"), span("VYRX"), CAP_HEIGHT),
    "two-line": (
        word_letters("VY") + word_letters("RX", dx=SECOND_LINE_INDENT, dy=CAP_HEIGHT + LINE_GAP),
        TWO_LINE_WIDTH,
        TWO_LINE_HEIGHT,
    ),
    "mark-v": (word_letters("V"), WIDTH["V"], CAP_HEIGHT),
    "mark-x": (word_letters("X"), WIDTH["X"], CAP_HEIGHT),
}


def check() -> None:
    """What the boxes claim has to be what the letters do. Two earlier versions of this file had a tile
    come out lop-sided because an offset was counted twice; a number here is cheaper than an eye later."""
    expectations = {
        "span of VYRX": (span("VYRX"), 826.0),
        "span of VY": (span("VY"), 420.0),
        "span of RX": (span("RX"), 374.0),
        "two-line box": (TWO_LINE_WIDTH, 420.0),
    }
    for what, (found, wanted) in expectations.items():
        if abs(found - wanted) > 0.5:
            raise SystemExit(f"{what}: {found:.1f}, expected {wanted:.1f}")


def file(box: tuple[float, float], markup: str, fill: str) -> str:
    """A standalone SVG: the arrangement, padded, in one colour."""
    width, height = box[0] + PADDING * 2, box[1] + PADDING * 2
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width:.0f} {height:.0f}" role="img" '
        f'aria-label="VYRX"><g transform="translate({PADDING} {PADDING})" fill="{fill}">{markup}</g></svg>'
    )


def tile(markup: str, box: tuple[float, float], size: int, coverage: float, radius: float) -> str:
    """The mark on a filled rounded square. `coverage` is how much of the tile it takes.

    For `maskable` that has to stay under 57 %: a round launcher mask shows a circle of 61 % of the tile, and
    a square-ish block whose corners reach past it loses them.
    """
    scale = (size * coverage) / box[0]
    x = (size - box[0] * scale) / 2
    y = (size - box[1] * scale) / 2
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" role="img" aria-label="VYRX">'
        f'<rect width="{size}" height="{size}" rx="{size * radius:.0f}" fill="#000000"/>'
        f'<g transform="translate({x:.2f} {y:.2f}) scale({scale:.5f})" fill="#FFFFFF">{markup}</g></svg>'
    )


def raster(source: Path, size: int, target: Path, width: int) -> None:
    subprocess.run(
        ["magick", "-background", "#000000", "-density", "900", str(source), "-resize", f"{width}x{width}",
         "-strip", "-flatten", f"PNG24:{target}"],
        check=True,
    )


def main() -> None:
    check()
    for name, (markup, width, height) in ARRANGEMENTS.items():
        (HERE / f"{name}.svg").write_text(file((width, height), markup, "#000000"), encoding="utf-8")

    # The container, in the two sizes the browser asks for: one glyph where it is tiny, the name where there
    # is room for it.
    two_line_box = (TWO_LINE_WIDTH, TWO_LINE_HEIGHT)
    tiles = {
        "tile-v": tile(ARRANGEMENTS["mark-v"][0], (WIDTH["V"], CAP_HEIGHT), 512, 0.52, 0.18),
        "tile-app": tile(ARRANGEMENTS["two-line"][0], two_line_box, 512, 0.78, 0.18),
        "tile-maskable": tile(ARRANGEMENTS["two-line"][0], two_line_box, 512, 0.56, 0.18),
    }
    for name, markup in tiles.items():
        (HERE / f"{name}.svg").write_text(markup, encoding="utf-8")

    PUBLIC.mkdir(exist_ok=True)
    for size in (16, 32, 48):
        raster(HERE / "tile-v.svg", size, PUBLIC / f"favicon-{size}.png", size)
    subprocess.run(["magick", "favicon-16.png", "favicon-32.png", "favicon-48.png", "favicon.ico"],
                   cwd=PUBLIC, check=True)
    (PUBLIC / "favicon.svg").write_text(tiles["tile-v"], encoding="utf-8")
    raster(HERE / "tile-app.svg", 180, PUBLIC / "apple-touch-icon.png", 180)
    raster(HERE / "tile-app.svg", 192, PUBLIC / "icon-192.png", 192)
    raster(HERE / "tile-app.svg", 512, PUBLIC / "icon-512.png", 512)
    raster(HERE / "tile-maskable.svg", 512, PUBLIC / "icon-maskable-512.png", 512)
    for stale in PUBLIC.glob("favicon-*[0-9].png"):
        stale.unlink()

    verify()
    print("\n".join(sorted(p.name for p in PUBLIC.iterdir())))


def verify() -> None:
    """Measure the result instead of trusting it: the ink has to sit centred in every tile.

    This is the check that the y-normalisation above was missing - the artwork was the right size and hung
    out of the bottom edge, which no assertion about boxes could see.
    """
    for name in ("icon-512", "icon-maskable-512", "apple-touch-icon"):
        path = PUBLIC / f"{name}.png"
        out = subprocess.run(
            ["magick", str(path), "-fuzz", "10%", "-trim", "-format", "%wx%h%X%Y", "info:"],
            capture_output=True, text=True, check=True).stdout
        box = re.match(r"(\d+)x(\d+)\+(\d+)\+(\d+)$", out)
        if not box:
            raise SystemExit(f"{name}: could not read the ink box from {out!r}")
        width, height, x, y = (int(value) for value in box.groups())
        canvas = 180 if name == "apple-touch-icon" else 512
        off_center = max(abs(x - (canvas - width - x)), abs(y - (canvas - height - y)))
        if off_center > canvas * 0.02:
            raise SystemExit(
                f"{name}: the mark sits {off_center} px off centre ({width}x{height} at {x},{y} in {canvas})")


if __name__ == "__main__":
    main()
