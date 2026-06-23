#!/usr/bin/env python3
"""Finalize one Idle Wizard player avatar as a 173x216 transparent PNG."""

from __future__ import annotations

import argparse
import json
from collections import deque
from pathlib import Path

from PIL import Image


TARGET_SIZE = (173, 216)


def parse_hex_color(value: str) -> tuple[int, int, int]:
    text = value.strip().lstrip("#")
    if len(text) != 6:
        raise ValueError(f"invalid color: {value}")
    return tuple(int(text[index : index + 2], 16) for index in (0, 2, 4))


def color_distance(a: tuple[int, int, int], b: tuple[int, int, int]) -> float:
    return sum((a[index] - b[index]) ** 2 for index in range(3)) ** 0.5


def sampled_border_color(image: Image.Image) -> tuple[int, int, int]:
    width, height = image.size
    samples = []
    for x in range(width):
        samples.append(image.getpixel((x, 0))[:3])
        samples.append(image.getpixel((x, height - 1))[:3])
    for y in range(height):
        samples.append(image.getpixel((0, y))[:3])
        samples.append(image.getpixel((width - 1, y))[:3])
    channels = []
    for channel in range(3):
        values = sorted(pixel[channel] for pixel in samples)
        channels.append(values[len(values) // 2])
    return tuple(channels)


def remove_connected_background(
    image: Image.Image,
    key_color: tuple[int, int, int] | None,
    tolerance: int,
) -> Image.Image:
    image = image.convert("RGBA")
    width, height = image.size
    pixels = image.load()
    target = key_color or sampled_border_color(image)
    candidate = bytearray(width * height)

    for y in range(height):
        for x in range(width):
            red, green, blue, alpha = pixels[x, y]
            if alpha and color_distance((red, green, blue), target) <= tolerance:
                candidate[y * width + x] = 1

    queue: deque[tuple[int, int]] = deque()
    visited = bytearray(width * height)

    def add_if_candidate(x: int, y: int) -> None:
        idx = y * width + x
        if candidate[idx] and not visited[idx]:
            visited[idx] = 1
            queue.append((x, y))

    for x in range(width):
        add_if_candidate(x, 0)
        add_if_candidate(x, height - 1)
    for y in range(height):
        add_if_candidate(0, y)
        add_if_candidate(width - 1, y)

    while queue:
        x, y = queue.popleft()
        pixels[x, y] = (0, 0, 0, 0)
        if x > 0:
            add_if_candidate(x - 1, y)
        if x + 1 < width:
            add_if_candidate(x + 1, y)
        if y > 0:
            add_if_candidate(x, y - 1)
        if y + 1 < height:
            add_if_candidate(x, y + 1)

    return image


def clean_alpha(image: Image.Image, alpha_threshold: int) -> Image.Image:
    image = image.convert("RGBA")
    pixels = image.load()
    width, height = image.size
    for y in range(height):
        for x in range(width):
            red, green, blue, alpha = pixels[x, y]
            if alpha <= alpha_threshold:
                pixels[x, y] = (0, 0, 0, 0)
    return image


def remove_tiny_components(image: Image.Image, min_pixels: int) -> Image.Image:
    if min_pixels <= 1:
        return image
    image = image.convert("RGBA")
    alpha = image.getchannel("A")
    width, height = image.size
    visited = bytearray(width * height)
    pixels = image.load()

    for start_y in range(height):
        for start_x in range(width):
            start_idx = start_y * width + start_x
            if visited[start_idx] or alpha.getpixel((start_x, start_y)) == 0:
                continue
            queue = deque([(start_x, start_y)])
            visited[start_idx] = 1
            component = []
            while queue:
                x, y = queue.popleft()
                component.append((x, y))
                for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                    if nx < 0 or ny < 0 or nx >= width or ny >= height:
                        continue
                    idx = ny * width + nx
                    if visited[idx] or alpha.getpixel((nx, ny)) == 0:
                        continue
                    visited[idx] = 1
                    queue.append((nx, ny))
            if len(component) < min_pixels:
                for x, y in component:
                    pixels[x, y] = (0, 0, 0, 0)

    return image


def normalize_to_target(
    image: Image.Image,
    target_size: tuple[int, int],
    max_content_width: int,
    max_content_height: int,
    bottom_margin: int,
) -> tuple[Image.Image, dict]:
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    if not bbox:
        raise ValueError("image contains no visible pixels after cleanup")

    content = image.crop(bbox)
    scale = min(max_content_width / content.width, max_content_height / content.height, 1.0)
    scaled_size = (
        max(1, round(content.width * scale)),
        max(1, round(content.height * scale)),
    )
    content = content.resize(scaled_size, Image.Resampling.LANCZOS)

    output = Image.new("RGBA", target_size, (0, 0, 0, 0))
    left = (target_size[0] - scaled_size[0]) // 2
    top = target_size[1] - bottom_margin - scaled_size[1]
    top = max(0, min(top, target_size[1] - scaled_size[1]))
    output.alpha_composite(content, (left, top))
    out_bbox = output.getchannel("A").getbbox()
    return output, {
        "source_bbox": list(bbox),
        "scale": scale,
        "placed_box": [left, top, left + scaled_size[0], top + scaled_size[1]],
        "final_bbox": list(out_bbox) if out_bbox else None,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--report", type=Path)
    parser.add_argument("--target-width", type=int, default=TARGET_SIZE[0])
    parser.add_argument("--target-height", type=int, default=TARGET_SIZE[1])
    parser.add_argument("--background", choices=["auto", "alpha", "border", "chroma"], default="auto")
    parser.add_argument("--chroma-key", default="#00ff00")
    parser.add_argument("--tolerance", type=int, default=52)
    parser.add_argument("--alpha-threshold", type=int, default=8)
    parser.add_argument("--min-component-pixels", type=int, default=6)
    parser.add_argument("--max-content-width", type=int, default=165)
    parser.add_argument("--max-content-height", type=int, default=196)
    parser.add_argument("--bottom-margin", type=int, default=16)
    args = parser.parse_args()

    image = Image.open(args.input).convert("RGBA")
    original_size = image.size
    mode = args.background
    if mode == "auto":
        has_transparent_border = any(
            image.getpixel((x, y))[3] == 0
            for x, y in (
                (0, 0),
                (image.width - 1, 0),
                (0, image.height - 1),
                (image.width - 1, image.height - 1),
            )
        )
        mode = "alpha" if has_transparent_border else "chroma"

    if mode in {"border", "chroma"}:
        key_color = parse_hex_color(args.chroma_key) if mode == "chroma" else None
        image = remove_connected_background(image, key_color, args.tolerance)

    image = clean_alpha(image, args.alpha_threshold)
    image = remove_tiny_components(image, args.min_component_pixels)
    final, report = normalize_to_target(
        image,
        (args.target_width, args.target_height),
        args.max_content_width,
        args.max_content_height,
        args.bottom_margin,
    )

    args.output.parent.mkdir(parents=True, exist_ok=True)
    final.save(args.output)

    report.update(
        {
            "input": str(args.input),
            "output": str(args.output),
            "original_size": list(original_size),
            "target_size": [args.target_width, args.target_height],
            "background_mode": mode,
        }
    )
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
