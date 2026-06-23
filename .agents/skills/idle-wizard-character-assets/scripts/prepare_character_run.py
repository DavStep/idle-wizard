#!/usr/bin/env python3
"""Prepare an Idle Wizard character asset run."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


DEFAULT_CHROMA = "#00ff00"


def load_specs(path: Path | None, count: int) -> dict:
    if path:
        return json.loads(path.read_text(encoding="utf-8"))

    return {
        "version": 1,
        "asset_type": "player-avatar",
        "chroma_key": DEFAULT_CHROMA,
        "characters": [
            {
                "id": f"character_{index:02d}",
                "label": f"character {index}",
                "role": "sleepy fantasy villager",
                "palette": "muted robe, warm accent",
                "prop": "small fantasy prop held close",
                "avoid": "",
            }
            for index in range(1, count + 1)
        ],
    }


def safe_id(value: object) -> str:
    text = str(value or "").strip().lower().replace("_", "-")
    cleaned = "".join(ch for ch in text if ch.isalnum() or ch == "-").strip("-")
    if not cleaned:
        raise ValueError("character id is required")
    return cleaned


def prompt_for(character: dict, chroma_key: str) -> str:
    role = character.get("role", "fantasy character")
    label = character.get("label", character.get("id", "character"))
    palette = character.get("palette", "muted fantasy colors")
    prop = character.get("prop", "none")
    avoid = character.get("avoid", "")

    avoid_line = f"\nExtra avoid: {avoid}." if avoid else ""
    prop_line = "No prop." if prop in {"", None, "none"} else f"Prop: {prop}."

    return f"""Create one Idle Wizard player avatar.

Asset type: 173x216 game avatar source, final will become transparent PNG.
Character id: {character["id"]}.
Visible label: {label}.
Subject: {role}.
Palette: {palette}.
{prop_line}
Style: same style family as the provided Idle Wizard avatar references: chibi fantasy bust portrait, oversized head, small shoulders and hands, thick dark outline, sleepy half-lidded deadpan expression, simple cel shading, muted fantasy colors.
Composition: centered bust, head and hat/upper silhouette fully inside frame, hands/prop close to body, generous clean padding, no clipping.
Fantasy direction: fantasy themed, not necessarily a mage; witch hat optional.
Background: perfectly flat solid {chroma_key} chroma-key background only, no shadows, no texture, no gradient.
Constraints: one character only, no text, no logo, no watermark, no scenery, no frame, no floor shadow, no glow, no aura, no particles, no detached effects, no modern or sci-fi items.{avoid_line}
"""


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--run-dir", required=True, type=Path)
    parser.add_argument("--characters-json", type=Path)
    parser.add_argument("--count", type=int, default=6)
    args = parser.parse_args()

    request = load_specs(args.characters_json, args.count)
    asset_type = request.get("asset_type", "player-avatar")
    chroma_key = request.get("chroma_key", DEFAULT_CHROMA)
    characters = request.get("characters", [])
    if not characters:
        raise SystemExit("no characters in request")

    run_dir = args.run_dir
    for name in ["config", "prompts", "raw", "final", "qa"]:
        (run_dir / name).mkdir(parents=True, exist_ok=True)

    normalized = []
    for raw_character in characters:
        character = dict(raw_character)
        character["id"] = safe_id(character.get("id"))
        character.setdefault("label", character["id"])
        prompt_path = run_dir / "prompts" / f'{character["id"]}.md'
        prompt_path.write_text(prompt_for(character, chroma_key), encoding="utf-8")
        normalized.append(
            {
                **character,
                "prompt_file": str(prompt_path.relative_to(run_dir)),
                "raw_file": f'raw/{character["id"]}.png',
                "final_file": f'final/{character["id"]}.png',
                "report_file": f'final/{character["id"]}.json',
            }
        )

    request_out = {
        "version": 1,
        "asset_type": asset_type,
        "target_size": [173, 216],
        "chroma_key": chroma_key,
        "characters": normalized,
    }
    (run_dir / "config" / "characters.json").write_text(
        json.dumps(request_out, indent=2) + "\n",
        encoding="utf-8",
    )
    (run_dir / "manifest.json").write_text(
        json.dumps(
            {
                "version": 1,
                "asset_type": asset_type,
                "target_size": [173, 216],
                "chroma_key": chroma_key,
                "characters": normalized,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"prepared {len(normalized)} character prompts in {run_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
