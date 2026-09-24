#!/usr/bin/env python3
"""Build the VYRX logo asset set from the geometry ChatGPT delivered.

Origin of the geometry: user-provided script (ChatGPT output, 2026-09-24).
Two deviations from that script, both deliberate and marked:

  * the X is placed with the same 20-unit gap as every other letter pair
    (the delivered `translate(-95,0)` puts the X *inside* the R),
  * the square mark drops the overlapping V/Y ligature, because at 32 px it
    is a blob (see preview.html) - the V alone stays legible.

Everything else (V, Y, R paths, the 1000-unit design grid, the 265 cap height)
is unchanged. Output is vector-only: no bitmap, no font dependency.
"""
from pathlib import Path

HERE = Path(__file__).parent

LETTERS = [
    # V
    '<path d="M35 40 H95 L175 180 L255 40 H315 L200 225 H150 Z"/>',
    # Y
    '<path d="M335 40 H397 L465 116 L533 40 H595 L495 153 V225 H435 V153 Z"/>',
    # R - angular bowl (evenodd counter) plus diagonal leg
    '<path fill-rule="evenodd" d="M615 40 H775 Q850 40 850 105 Q850 151 805 166 L875 225 H795 L740 174 H675 V225 H615 Z '
    'M675 92 V127 H775 Q790 127 790 109 Q790 92 775 92 Z"/>',
]

X_ORIGINAL = ('<path d="M850 40 H920 L965 96 L1010 40 H1080 L1000 132 L1085 225 H1012 L965 166 L918 225 H845 L930 132 Z" '
              'transform="translate(-95,0)"/>')
X_SPACED = ('<path d="M850 40 H920 L965 96 L1010 40 H1080 L1000 132 L1085 225 H1012 L965 166 L918 225 H845 L930 132 Z" '
            'transform="translate(50,0)"/>')

WORDMARK = LETTERS + [X_SPACED]
WORDMARK_DELIVERED = LETTERS + [X_ORIGINAL]
# R ends at x=875, each gap is 20 units, the X path spans 845..1085 before its transform.
WORDMARK_VIEWBOX = "0 0 1170 265"

# The square mark: the V from the same grid, scaled into 256 with 44 units of padding.
V = LETTERS[0]
SCALE = (256 - 88) / 280.0
V_MARK = f'<g transform="translate({44 - 35 * SCALE:.2f},{(256 - 185 * SCALE) / 2 - 40 * SCALE:.2f}) scale({SCALE:.4f})">{V}</g>'


# Optional variant: the same letters on the tracking the brand sheet shows.
# The sheet's gaps are 43/45/37 px at a cap height of 137, i.e. 58/61/50 units on
# this grid - about three times the 20 units above. Shifted, not re-drawn; the
# letters themselves are unchanged.
GAPS_LOOSE = {"Y": 56, "R": 57, "X": 50}


def wordmark_loose(fill: str) -> str:
    x = 35
    out = []
    for name, path in zip("VYRX", [LETTERS[0], LETTERS[1], LETTERS[2], X_SPACED]):
        if name != "V":
            x += GAPS_LOOSE[name]
        shift = x - {"V": 35, "Y": 335, "R": 615, "X": 895}[name]
        out.append(path.replace('<path ', f'<g transform="translate({shift},0)"><path ').replace('/>', '/></g>'))
        # width of each letter as drawn
        x += {"V": 280, "Y": 260, "R": 260, "X": 240}[name]
    return svg(f'<g fill="{fill}">{"".join(out)}</g>', f"0 0 {x + 35} 265", "VYRX",
               "VYRX wordmark on the brand sheet's looser tracking.")


def svg(body: str, viewbox: str, title: str, desc: str) -> str:
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{viewbox}" role="img" '
            f'aria-labelledby="t d"><title id="t">{title}</title><desc id="d">{desc}</desc>{body}</svg>\n')


def wordmark(fill: str, bg: str | None = None, delivered: bool = False) -> str:
    rect = f'<rect width="100%" height="100%" fill="{bg}"/>' if bg else ''
    shapes = ''.join(WORDMARK_DELIVERED if delivered else WORDMARK)
    return svg(f'{rect}<g fill="{fill}">{shapes}</g>',
               WORDMARK_VIEWBOX, "VYRX",
               "VYRX wordmark, drawn as vector paths on a 1000-unit grid.")


def tile() -> str:
    """App icon in the style of the brand sheet: black rounded square, the
    wordmark in white. The wordmark takes 72 % of the width - deliberately less
    than the sheet's ~84 %, because a launcher may crop the tile with a
    circular or squircle mask and every mask eats the corners."""
    width = 512 * 0.72
    s = width / 1170
    tx = (512 - width) / 2
    ty = (512 - 265 * s) / 2
    shapes = ''.join(WORDMARK)
    return svg(
        f'<rect width="512" height="512" rx="113" fill="#000000"/>'
        f'<g fill="#FFFFFF" transform="translate({tx:.2f},{ty:.2f}) scale({s:.4f})">{shapes}</g>',
        "0 0 512 512", "VYRX",
        "VYRX app icon: black rounded square with the wordmark in white.")


def tile_v() -> str:
    """The favicon the sheet does not show: the same black rounded square, but
    with the V alone. Two reasons. At 16 px a four-letter wordmark is a smudge
    (the sheet's own 32 px icon proves it). And a glyph drawn *transparent* goes
    invisible on a dark tab bar, while the tile keeps its edge on both."""
    width = 512 * 0.52
    s = width / 256
    tx = (512 - width) / 2
    ty = (512 - 256 * s) / 2
    return svg(
        f'<rect width="512" height="512" rx="113" fill="#000000"/>'
        f'<g fill="#FFFFFF" transform="translate({tx:.2f},{ty:.2f}) scale({s:.4f})">{V_MARK}</g>',
        "0 0 512 512", "VYRX",
        "VYRX favicon: black rounded square with the V in white.")


def maskable() -> str:
    """Full bleed, artwork inside the central 66/108 safe circle of an Android
    adaptive icon. The V alone, because the wordmark cannot survive 61 %."""
    return svg(
        '<rect width="512" height="512" fill="#000000"/>'
        f'<g fill="#FFFFFF" transform="translate(256,256) scale({66 / 108:.4f}) translate(-128,-128)">{V_MARK}</g>',
        "0 0 512 512", "VYRX",
        "VYRX maskable icon: full bleed black, V inside the Android safe circle.")


def mark(fill: str, bg: str | None = None, viewbox: str = "0 0 256 256", scale: str = "1") -> str:
    rect = f'<rect width="100%" height="100%" fill="{bg}"/>' if bg else ''
    inner = V_MARK if scale == "1" else f'<g transform="translate(128,128) scale({scale}) translate(-128,-128)">{V_MARK}</g>'
    return svg(f'{rect}<g fill="{fill}">{inner}</g>', viewbox, "VYRX",
               "VYRX square mark: the V of the wordmark on the same grid.")


files = {
    # wordmark, delivery state and corrected state
    "wordmark-delivered.svg": wordmark("#000000", delivered=True),
    "wordmark.svg": wordmark("#000000"),
    "wordmark-white.svg": wordmark("#FFFFFF"),
    "wordmark-white-on-black.svg": wordmark("#FFFFFF", "#000000"),
    "wordmark-loose.svg": wordmark_loose("#000000"),
    "wordmark-loose-white.svg": wordmark_loose("#FFFFFF"),
    # square mark
    "mark.svg": mark("#000000"),
    "mark-white-on-black.svg": mark("#FFFFFF", "#000000"),
    # app icons in the brand sheet's style
    "icon-tile.svg": tile(),
    "icon-tile-v.svg": tile_v(),
    "icon-maskable.svg": maskable(),
    # maskable check drawn on a 256 field, for the preview
    "mark-maskable.svg": mark("#FFFFFF", "#000000", scale="0.68"),
}
for name, content in files.items():
    (HERE / name).write_text(content, encoding="utf-8")

# icon-192 and icon-512 carry the tile the brand sheet shows (rounded square, wordmark);
# icon-maskable-512 carries the V on full bleed, because a round launcher mask would clip
# the ends of a wordmark that spans the tile.
(HERE / "site.webmanifest").write_text("""{
  "name": "VYRX",
  "short_name": "VYRX",
  "description": "Sicherer Zugang zur privaten Infrastruktur, Anwendungen und Mesh-Status.",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#000000",
  "theme_color": "#000000",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
""", encoding="utf-8")

print("\n".join(sorted(p.name for p in HERE.iterdir())))
