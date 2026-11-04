#!/usr/bin/env python3
"""Turn a raw portrait into card art.

Removes a flat white background, trims the empty margin and sizes the cutout so it
drops straight into src/assets/cards.

    python3 scripts/prepare-portraits.py --id saint-velvet portrait.png
    python3 scripts/prepare-portraits.py --id liv-orchid--keep-bg portrait.png
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from PIL import Image, ImageDraw

DEST = Path(__file__).resolve().parent.parent / "src" / "assets" / "cards"
KEY = (255, 0, 255, 255)
TARGET_WIDTH = 1024


def near_white(pixel: tuple[int, ...], tolerance: int) -> bool:
    if pixel[3] == 0:
        return True
    return all(channel >= 255 - tolerance for channel in pixel[:3])


def cut_background(image: Image.Image, tolerance: int) -> Image.Image:
    rgba = image.convert("RGBA")
    width, height = rgba.size
    corners = [(0, 0), (width - 1, 0), (0, height - 1), (width - 1, height - 1)]
    for corner in corners:
        if near_white(rgba.getpixel(corner), tolerance):
            ImageDraw.floodfill(rgba, corner, KEY, thresh=tolerance)

    pixels = rgba.load()
    for y in range(height):
        for x in range(width):
            if pixels[x, y] == KEY:
                pixels[x, y] = (0, 0, 0, 0)
    return rgba


def trim(image: Image.Image) -> Image.Image:
    box = image.getbbox()
    return image.crop(box) if box else image


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--id", required=True, help="artist id, e.g. saint-velvet")
    parser.add_argument("--keep-bg", action="store_true", help="keep the background")
    parser.add_argument("--tolerance", type=int, default=26)
    args = parser.parse_args()

    image = Image.open(args.source)
    if not args.keep_bg:
        image = cut_background(image, args.tolerance)
    image = trim(image)

    if image.width != TARGET_WIDTH:
        height = round(image.height * TARGET_WIDTH / image.width)
        image = image.resize((TARGET_WIDTH, height), Image.LANCZOS)

    DEST.mkdir(parents=True, exist_ok=True)
    target = DEST / f"{args.id}.png"
    image.save(target, "PNG", optimize=True)
    print(f"{target.relative_to(DEST.parent.parent.parent)} -> {image.size[0]}x{image.size[1]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
