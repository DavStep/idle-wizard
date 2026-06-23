#!/usr/bin/env python3
"""Validate finalized Idle Wizard character avatar PNGs."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image


def padding_from_bbox(bbox: tuple[int, int, int, int], size: tuple[int, int]) -> dict:
    left, top, right, bottom = bbox
    width, height = size
    return {
        "left": left,
        "top": top,
        "right": width - right,
        "bottom": height - bottom,
    }


def validate_file(path: Path, target_size: tuple[int, int], min_padding: int) -> dict:
    result = {"file": str(path), "ok": True, "errors": [], "warnings": []}
    try:
        image = Image.open(path).convert("RGBA")
    except Exception as exc:  # noqa: BLE001
        result["ok"] = False
        result["errors"].append(f"cannot open image: {exc}")
        return result

    result["size"] = list(image.size)
    result["mode"] = "RGBA"
    if image.size != target_size:
        result["ok"] = False
        result["errors"].append(f"expected {target_size[0]}x{target_size[1]}")

    alpha = image.getchannel("A")
    extrema = alpha.getextrema()
    bbox = alpha.getbbox()
    result["alpha"] = {"min": extrema[0], "max": extrema[1]}
    result["bbox"] = list(bbox) if bbox else None
    if extrema[0] != 0:
        result["ok"] = False
        result["errors"].append("alpha minimum is not 0")
    if extrema[1] != 255:
        result["warnings"].append("alpha maximum is not 255")
    if not bbox:
        result["ok"] = False
        result["errors"].append("no visible pixels")
        return result

    pads = padding_from_bbox(bbox, image.size)
    result["padding"] = pads
    for side, amount in pads.items():
        if amount < min_padding:
            result["ok"] = False
            result["errors"].append(f"{side} padding {amount}px below {min_padding}px")

    histogram = alpha.histogram()
    visible_pixels = sum(histogram[1:])
    result["visible_pixels"] = visible_pixels
    if visible_pixels < 1800:
        result["warnings"].append("very low visible pixel count")
    return result


def manifest_files(manifest_path: Path | None, input_dir: Path) -> list[Path]:
    if not manifest_path:
        return sorted(input_dir.glob("*.png"))
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    files = []
    root = manifest_path.parent
    for character in manifest.get("characters", []):
        final_file = character.get("final_file")
        if final_file:
            files.append(root / final_file)
    return files


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input-dir", required=True, type=Path)
    parser.add_argument("--manifest", type=Path)
    parser.add_argument("--expected-count", type=int)
    parser.add_argument("--target-width", type=int, default=173)
    parser.add_argument("--target-height", type=int, default=216)
    parser.add_argument("--min-padding", type=int, default=4)
    parser.add_argument("--json-out", type=Path)
    args = parser.parse_args()

    files = manifest_files(args.manifest, args.input_dir)
    expected_count = args.expected_count if args.expected_count is not None else len(files)
    results = [
        validate_file(path, (args.target_width, args.target_height), args.min_padding)
        for path in files
    ]
    errors = []
    if len(files) != expected_count:
        errors.append(f"expected {expected_count} files, found {len(files)}")
    for item in results:
        errors.extend(f"{Path(item['file']).name}: {error}" for error in item["errors"])

    output = {
        "ok": not errors,
        "target_size": [args.target_width, args.target_height],
        "expected_count": expected_count,
        "files": results,
        "errors": errors,
    }
    if args.json_out:
        args.json_out.parent.mkdir(parents=True, exist_ok=True)
        args.json_out.write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(output, indent=2))
    return 0 if output["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
