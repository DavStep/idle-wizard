#!/usr/bin/env python3
"""Create Idle Wizard character QA contact sheets."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


TARGET_SIZE = (173, 216)
UI_CROPS = [
    ("settings 72", 72, 0.52),
    ("top 58", 58, 0.13),
    ("info 72", 72, 0.28),
    ("inline 18", 18, 0.13),
    ("rank 16", 16, 0.13),
    ("chat 12", 12, 0.13),
]


def checker(size: tuple[int, int], cell: int = 8) -> Image.Image:
    image = Image.new("RGBA", size, (255, 255, 255, 255))
    draw = ImageDraw.Draw(image)
    for y in range(0, size[1], cell):
        for x in range(0, size[0], cell):
            if (x // cell + y // cell) % 2:
                draw.rectangle((x, y, x + cell - 1, y + cell - 1), fill=(196, 196, 196, 255))
    return image


def label(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str) -> None:
    draw.text(xy, text, fill=(0, 0, 0, 255), font=ImageFont.load_default())


def contact_sheet(files: list[Path], background: str, output: Path) -> None:
    tile_w, tile_h = 205, 250
    image = Image.new("RGBA", (tile_w * len(files), tile_h), (255, 255, 255, 255))
    draw = ImageDraw.Draw(image)
    for index, path in enumerate(files):
        x = index * tile_w
        if background == "checkerboard":
            tile = checker(TARGET_SIZE)
        elif background == "black":
            tile = Image.new("RGBA", TARGET_SIZE, (0, 0, 0, 255))
        else:
            tile = Image.new("RGBA", TARGET_SIZE, (255, 255, 255, 255))
        avatar = Image.open(path).convert("RGBA")
        tile.alpha_composite(avatar)
        image.alpha_composite(tile, (x + 16, 18))
        label(draw, (x + 16, 222), path.stem)
    output.parent.mkdir(parents=True, exist_ok=True)
    image.convert("RGB").save(output)


def object_fit_cover_crop(image: Image.Image, square: int, y_position: float) -> Image.Image:
    width, height = image.size
    crop_height = width
    top = round((height - crop_height) * y_position)
    top = max(0, min(top, height - crop_height))
    crop = image.crop((0, top, width, top + crop_height))
    return crop.resize((square, square), Image.Resampling.LANCZOS)


def ui_crop_sheet(files: list[Path], output: Path) -> None:
    row_h = 96
    name_w = 84
    gap = 10
    column_widths = [max(size, 64) for _, size, _ in UI_CROPS]
    total_w = name_w + sum(column_widths) + gap * (len(UI_CROPS) + 1)
    total_h = 28 + row_h * len(files)
    image = Image.new("RGBA", (total_w, total_h), (255, 255, 255, 255))
    draw = ImageDraw.Draw(image)
    x = name_w + gap
    for (title, _size, _), column_width in zip(UI_CROPS, column_widths):
        label(draw, (x, 8), title)
        x += column_width + gap

    for row, path in enumerate(files):
        y = 28 + row * row_h
        label(draw, (8, y + 30), path.stem)
        avatar = Image.open(path).convert("RGBA")
        x = name_w + gap
        for (_, size, y_position), column_width in zip(UI_CROPS, column_widths):
            tile = checker((size, size), max(2, min(8, size // 4)))
            crop = object_fit_cover_crop(avatar, size, y_position)
            tile.alpha_composite(crop)
            image.alpha_composite(tile, (x + (column_width - size) // 2, y + 8))
            x += column_width + gap
    output.parent.mkdir(parents=True, exist_ok=True)
    image.convert("RGB").save(output)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input-dir", required=True, type=Path)
    parser.add_argument("--out-dir", required=True, type=Path)
    args = parser.parse_args()

    files = sorted(args.input_dir.glob("*.png"))
    if not files:
        raise SystemExit("no PNG files found")

    contact_sheet(files, "checkerboard", args.out_dir / "checkerboard.png")
    contact_sheet(files, "white", args.out_dir / "white-background.png")
    contact_sheet(files, "black", args.out_dir / "black-background.png")
    ui_crop_sheet(files, args.out_dir / "ui-crops.png")
    print(f"wrote QA sheets to {args.out_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
