---
name: idle-wizard-character-generation
description: Use for Idle Wizard chibi character image generation when the user says "generate character", asks to generate character/adventurer assets, or wants new characters matching the provided wizard/adventurer reference grids. This step-1 workflow uses fixed reference assets and a fixed base prompt; it does not add selectable avatars, gameplay code, or project asset integration unless explicitly requested.
---

# Idle Wizard Character Generation

## Scope

This skill currently implements step 1 only: generate a preview image from the fixed prompt and the two bundled reference grids.

Do not create or restore a selectable avatar system. Do not write into `src/assets/characters` or gameplay code unless the user explicitly asks for project integration after generation.

## Reference Assets

Use both bundled assets as style references:

- `assets/reference-grid-01.png`
- `assets/reference-grid-02.png`

Treat them as reference images, not edit targets. Before using the built-in image generation tool, inspect both images with `view_image` so they are visible in conversation context unless the same references are already visible in the current thread.

## Fixed Prompt

Use this prompt verbatim as the base prompt whenever the user says `generate character` without providing a replacement prompt:

```text
having this EXACTY style as guideline generate 8 more characters, more adventurers less mages make sure you keep the same artstyle
-same face size
-same half-lidded sleepy eyes from the references
-same small flat oval pupils, same pupil size, same pupil position, same iris shape
-no round anime eyes, no shiny dot pupils, no changed pupil geometry
-keep details MINIMAL
-no texture/noise, use solid colors
-soft light effect
-for face expresission change only the eyebrows and mouth
```

## Workflow

1. Use the `imagegen` skill with the built-in `image_gen` path.
2. Load both reference assets with `view_image`.
3. Call `image_gen` once with a prompt that includes:
   - the fixed prompt above, unchanged;
   - `Input images: reference-grid-01 and reference-grid-02 are style references only`;
   - `Use case: stylized-concept`;
   - `Asset type: preview character generation sheet`;
   - `Make sure it doesn't use: extra texture, noise, painterly grain, realistic rendering, large expression changes, mismatched pupils, round anime eyes, shiny dot pupils, changed iris shapes, oversized or undersized faces, ornate detail`.
4. Default to preview-only output. Do not move generated files into the repo unless the user asks to save or integrate them.
5. If the user asks to save the approved output, place it under `tmp/character-generation/` unless they name another destination.
