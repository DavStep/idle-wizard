# Character Style Contract

## Current Shared Avatar Format

- Final player avatar size: `173x216`.
- File format: RGBA PNG with transparent background.
- Current shared files: `src/assets/characters/*.png`.
- Current count is six: `elara`, `mira`, `bramble`, `corvin`, `juniper`, `rowan`.

## Visual Style

Use this as the locked style family:

- chibi fantasy bust portrait
- oversized head, small shoulders, tiny hands
- sleepy or deadpan expression, half-lidded eyes
- thick dark outline, clean silhouette
- simple cel shading with modest highlights
- muted fantasy palette with one dominant robe/accent color
- compact prop allowed, one max, held close to body
- transparent final background

Fantasy theme is broad. Characters do not all need to be mages.

Allowed examples:

- witch, scholar, courier, herbalist, clerk, scribe, alchemist, ranger, sleepy knight, charm seller, guild helper, potion runner

Avoid:

- realistic human proportions
- full-body action poses
- open-mouth excitement by default
- thin line art
- painterly rendering
- modern clothing, guns, phones, headphones, sneakers, sci-fi gear
- text, letters, logos, badges with readable marks
- scenery, room backgrounds, floor shadows, glow, aura, particles, floating symbols
- detached pets or secondary characters

## Player Avatar Prompt Skeleton

Use with the current avatars as style references when possible:

```text
Create one Idle Wizard player avatar.

Asset type: 173x216 game avatar source, final will become transparent PNG.
Subject: <character id and short fantasy role>.
Style: same style family as the provided Idle Wizard avatar references: chibi fantasy bust portrait, oversized head, small shoulders and hands, thick dark outline, sleepy half-lidded deadpan expression, simple cel shading, muted fantasy colors.
Composition: centered bust, head and hat/upper silhouette fully inside frame, hands/prop close to body, generous clean padding, no clipping.
Fantasy direction: fantasy themed, not necessarily a mage; witch hat optional.
Background: perfectly flat solid <#00ff00 or #ff00ff> chroma-key background only, no shadows, no texture, no gradient.
Constraints: one character only, no text, no logo, no watermark, no scenery, no frame, no floor shadow, no glow, no aura, no particles, no detached effects, no modern or sci-fi items.
```

## Character Spec Fields

Use short specs. Do not over-describe.

```json
{
  "id": "example",
  "label": "example",
  "role": "sleepy fantasy courier",
  "palette": "moss cloak, brass pin, dark boots",
  "prop": "sealed letter held close",
  "avoid": "wizard hat"
}
```

## Regenerate Instead Of Repairing

Regenerate the image when:

- the character is clipped
- proportions drift away from chibi bust
- the face is not readable at tiny icon size
- background removal deletes hair, hat, prop, eyes, outline, or hands
- there is text, scenery, glow, shadow, or detached effects
- style looks like anime splash art, portrait painting, 3D render, mascot sticker, or pixel art
