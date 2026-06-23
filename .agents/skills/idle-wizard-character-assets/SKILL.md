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

Default generation reference:

- `references/avatar-style-reference.png`

If changing character selection UI, top-panel avatar UI, player info UI, world chat, leaderboard rows, or any other layout/code surface, also use `idle-wizard-ui-workflow`.

If generating or editing bitmap art, use `imagegen` and read its `SKILL.md` before generation.

## Asset Types

Default to `player-avatar` unless the user names a page/NPC/feature portrait.

- `player-avatar`: final file is `173x216` RGBA PNG. Shared selectable avatars live in `src/assets/characters`.
- `feature-portrait`: page-local character art can use a larger source size, but must still use this style contract and transparent final output.

Do not edit selectable character config unless the user explicitly asks to add, remove, or replace playable choices.

## Workflow

1. Inspect `references/avatar-style-reference.png`, existing references in `src/assets/characters`, and any relevant page-local `assets/characters`.
2. Read `references/style-contract.md`. Read `references/ui-targets.md` when asset usage or crop QA matters.
3. Create a run folder under `tmp/character-assets/<short-name>/`.
4. Prepare prompts and manifest. If the user gives a prompt that already works, preserve its style-locking language verbatim and only adapt count/character details.

```bash
python .agents/skills/idle-wizard-character-assets/scripts/prepare_character_run.py \
  --run-dir tmp/character-assets/<short-name> \
  --characters-json /absolute/path/to/characters.json
```

5. Choose generation mode:
   - `single`: one character. Use a strict reference image and one focused prompt.
   - `small-batch`: two to four characters. Generate individually unless the user asks for one sheet.
   - `pack-sheet`: five or more characters, or any request where pack consistency matters. Generate one wide horizontal sheet first, then split/finalize locally.
6. Save raw generated images into `run/raw/`.
7. For a sheet, validate visual consistency before splitting. For a single image, validate style before finalizing.
   Treat any missing, hidden, skin-colored, or uncertain mouth as a failed sheet/image, even when the expression otherwise reads sleepy.
8. Finalize each player avatar to the exact repo size:

```bash
python .agents/skills/idle-wizard-character-assets/scripts/finalize_character_avatar.py \
  --input tmp/character-assets/<short-name>/raw/<id>.png \
  --output tmp/character-assets/<short-name>/final/<id>.png \
  --report tmp/character-assets/<short-name>/final/<id>.json
```

9. Validate the pack:

```bash
python .agents/skills/idle-wizard-character-assets/scripts/validate_character_pack.py \
  --input-dir tmp/character-assets/<short-name>/final \
  --manifest tmp/character-assets/<short-name>/manifest.json \
  --json-out tmp/character-assets/<short-name>/qa/validation.json
```

10. Create visual QA sheets:

```bash
python .agents/skills/idle-wizard-character-assets/scripts/make_character_qa.py \
  --input-dir tmp/character-assets/<short-name>/final \
  --out-dir tmp/character-assets/<short-name>/qa
```

11. Inspect QA sheets before accepting. Check full size, black background, white background, checkerboard, and actual UI crops.
12. Copy approved final files into the repo only after the pack passes validation and visual QA.

## Generation Rules

- Do not assume the count is eight. Support one character, a few characters, or a full pack.
- Attach `references/avatar-style-reference.png` to generation runs by default. Treat a user-provided approved reference image as the primary style source for that run.
- Use the reference sheet to lock face grammar, line quality, proportions, and rendering. Do not clone its all-witch-hat silhouettes unless the user asks for witch variants.
- For one character, use the strictest possible reference prompt and keep the output visually compatible with the existing set.
- For a full pack, prefer a wide sheet when the user wants consistent style across all characters.
- Use exact character ids and lowercase labels.
- Keep fantasy broad: witch hats are allowed but not mandatory.
- Keep one centered bust per image. No scenery, text, logo, watermark, speech bubble, frame, floor shadow, glow, aura, or detached effects.
- Require a visible tiny deadpan mouth on every character. It must be a dark foreground mark below the nose, not a skin-color shadow, highlight, or implied expression. Beards, moustaches, scarves, collars, books, props, hands, and hair must not cover the mouth. A blank or covered lower face is a failed generation.
- For strict style matching, prefer plain white raw background. Use chroma key only when transparent cleanup is the main risk and style matching is already solved.
- Stop and regenerate when the character is clipped, style-drifts, becomes realistic, loses the sleepy chibi read, or fails small UI crops.

## Acceptance Criteria

- Player avatars are exactly `173x216` RGBA PNG.
- Transparent pixels have clean alpha, with no visible background residue.
- No visible pixels touch the output border.
- Character is readable at `72px`, `58px`, `18px`, `16px`, and `12px` square crops.
- Every character has visible eyes, nose, and a dark tiny mouth mark before and after finalization; the mouth remains visible through beards, scarves, collars, hands, props, and final UI crops.
- Same style family as current characters: chibi fantasy bust, thick outline, sleepy/deadpan expression, muted cel shading.
- Manifest, final PNGs, validation JSON, and QA sheets exist in the run folder.
