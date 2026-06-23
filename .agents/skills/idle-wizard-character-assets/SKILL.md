---
name: idle-wizard-character-assets
description: "Use for Idle Wizard character image asset work: generating, refining, finalizing, validating, or QAing fantasy player avatar PNGs and feature/NPC character portraits. Trigger when the user asks for new character avatars, character generation workflow, portrait style matching, transparent character PNG cleanup, character contact sheets, or adding/replacing files under src/assets/characters or page-local assets/characters."
---

# Idle Wizard Character Assets

## Required Context

Read first:

- `experience.md`
- `docs/ai-workflow.md`
- `references/style-contract.md`

If changing character selection UI, top-panel avatar UI, player info UI, world chat, leaderboard rows, or any other layout/code surface, also use `idle-wizard-ui-workflow`.

If generating or editing bitmap art, use `imagegen` and read its `SKILL.md` before generation.

## Asset Types

Default to `player-avatar` unless the user names a page/NPC/feature portrait.

- `player-avatar`: final file is `173x216` RGBA PNG. Shared selectable avatars live in `src/assets/characters`.
- `feature-portrait`: page-local character art can use a larger source size, but must still use this style contract and transparent final output.

Do not edit selectable character config unless the user explicitly asks to add, remove, or replace playable choices.

## Workflow

1. Inspect existing references in `src/assets/characters` and any relevant page-local `assets/characters`.
2. Read `references/style-contract.md`. Read `references/ui-targets.md` when asset usage or crop QA matters.
3. Create a run folder under `tmp/character-assets/<short-name>/`.
4. Prepare prompts and manifest:

```bash
python .agents/skills/idle-wizard-character-assets/scripts/prepare_character_run.py \
  --run-dir tmp/character-assets/<short-name> \
  --characters-json /absolute/path/to/characters.json
```

5. Generate one character at a time with `imagegen`, using the prompt file for that character and the existing avatar files as style references when possible.
6. Save raw generated images into `run/raw/<id>.png`.
7. Finalize each player avatar to the exact repo size:

```bash
python .agents/skills/idle-wizard-character-assets/scripts/finalize_character_avatar.py \
  --input tmp/character-assets/<short-name>/raw/<id>.png \
  --output tmp/character-assets/<short-name>/final/<id>.png \
  --report tmp/character-assets/<short-name>/final/<id>.json
```

8. Validate the pack:

```bash
python .agents/skills/idle-wizard-character-assets/scripts/validate_character_pack.py \
  --input-dir tmp/character-assets/<short-name>/final \
  --manifest tmp/character-assets/<short-name>/manifest.json \
  --json-out tmp/character-assets/<short-name>/qa/validation.json
```

9. Create visual QA sheets:

```bash
python .agents/skills/idle-wizard-character-assets/scripts/make_character_qa.py \
  --input-dir tmp/character-assets/<short-name>/final \
  --out-dir tmp/character-assets/<short-name>/qa
```

10. Inspect QA sheets before accepting. Check full size, black background, white background, checkerboard, and actual UI crops.
11. Copy approved final files into the repo only after the pack passes validation and visual QA.

## Generation Rules

- Generate individual characters, not a wide sheet, unless the user explicitly asks for a sheet.
- Use exact character ids and lowercase labels.
- Keep fantasy broad: witch hats are allowed but not mandatory.
- Keep one centered bust per image. No scenery, text, logo, watermark, speech bubble, frame, floor shadow, glow, aura, or detached effects.
- Prefer flat chroma-key background in raw generation, then remove background locally. Use `#00ff00` by default unless the character uses bright green; then use `#ff00ff`.
- Stop and regenerate when the character is clipped, style-drifts, becomes realistic, loses the sleepy chibi read, or fails small UI crops.

## Acceptance Criteria

- Player avatars are exactly `173x216` RGBA PNG.
- Transparent pixels have clean alpha, with no visible background residue.
- No visible pixels touch the output border.
- Character is readable at `72px`, `58px`, `18px`, `16px`, and `12px` square crops.
- Same style family as current characters: chibi fantasy bust, thick outline, sleepy/deadpan expression, muted cel shading.
- Manifest, final PNGs, validation JSON, and QA sheets exist in the run folder.
