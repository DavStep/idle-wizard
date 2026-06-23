# Character Style Contract

## Current Shared Avatar Format

- Final player avatar size: `173x216`.
- File format: RGBA PNG with transparent background.
- Current shared files: `src/assets/characters/*.png`.
- Current count is six: `elara`, `mira`, `bramble`, `corvin`, `juniper`, `rowan`.
- Default generation reference sheet: `references/avatar-style-reference.png`.

`references/avatar-style-reference.png` is a style reference only. It is not repo-ready final avatar art until split, background-cleaned, finalized to `173x216` transparent PNGs, validated, and visually QAed.

## Visual Style

Use this as the locked style family:

- chibi fantasy bust portrait
- oversized head, small shoulders, tiny hands
- sleepy or deadpan expression, half-lidded eyes
- visible tiny deadpan mouth on every character, usually a short dark dash or tiny curve below the nose; the mouth must be a dark foreground mark, not hidden or only implied
- thick dark outline, clean silhouette
- simple cel shading with modest highlights
- muted fantasy palette with one dominant robe/accent color
- compact prop allowed, one max, held close to body
- hands are tiny rounded mitten-like shapes with minimal finger detail
- clothing uses plain color blocks, few seams, almost no trim, no micro-accessories
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
- complex belts, straps, buckles, embroidery, armor plates, many pouches, ropes, tools, or jewelry
- detailed hands, separated fingers, large hands, or realistic gripping poses
- missing mouth, blank lower face, hidden mouth, covered mouth, skin-colored mouth, or mouth implied only by expression
- beard, moustache, scarf, collar, hair, hand, prop, book, or shield covering the mouth

## Single Character Prompt Skeleton

Use this exact user-approved base prompt for one-by-one generation. Replace only `[CHARACTER DEFINITION]` with the user's character text, and always load `references/avatar-style-reference.png` as the attached reference image before generation unless the user supplies an approved replacement reference.

```text
BASE PROMPT Using the attached image as the strict visual reference, create one wide horizontal sheet containing 1 completely new fantasy-medieval chibi avatar. Match the reference exactly in art style, big-head/tiny-body proportions, bust-only crop, thick clean black outlines, smooth cel-shading, subtle gradients, glossy highlights, upper-left lighting, sticker-like finish, character scale, spacing, pose language, and rendering quality. Keep the same half-lidded eye design, pupil direction, rounded cheeks, tiny nose, and small deadpan mouth style. Arrange the character on a plain white or transparent background. The character should face forward or turn only slightly, with their shoulders, arms, hands, and one small identifying prop visible. [CHARACTER DEFINITION] Clothing, hairstyle, facial hair, expression, and fantasy headwear may vary, but everything must remain simple and consistent with the original collection. Use a sleepy, unimpressed, calm, mildly grumpy, or subtly smug expression. The final result must look like 1 official new character created by the same artist for the same avatar pack, while avoiding copies of the original characters. Asset type: game avatar source, final will be cropped into one 173x216 transparent PNG. Negative prompt: realistic, semi-realistic, painterly, 3D, pixel art, western cartoon, full body, dynamic action pose, complex background, scenery, dramatic lighting, thin outlines, inconsistent proportions, inconsistent eye pupils, oversized props, highly detailed costumes, exaggerated emotions, open-mouth smile, shouting, duplicate characters, simple recolors, text, logo, watermark. CHARACTER DEFINITION Create a distinct fantasy character, not a simple recolor:
```

## Pack Sheet Prompt Skeleton

Use when the user wants several characters with high style consistency:

Attach `references/avatar-style-reference.png` as the strict visual reference unless the user supplies an approved replacement reference. Match its face grammar and rendering, but vary roles and silhouettes beyond witch hats unless witch variants are requested.

If the user provides a proven prompt, keep its style-locking phrases verbatim. Do not simplify away details such as `strict visual reference`, `face grammar`, `sticker-like finish`, `official new characters`, or the negative prompt.
Keep generation prompts compact. Put detailed failure checks in QA notes, not in the image prompt, unless a repeated failure needs one concise correction. Overlong constraint lists can make the model chase checklist compliance instead of the visual reference.

```text
Using the provided Idle Wizard avatar sheet as the strict visual reference, create one wide horizontal sheet containing <count> completely new fantasy-medieval chibi avatars.

Match the reference exactly in art style, big-head/tiny-body proportions, bust-only crop, thick clean black outlines, smooth cel shading, subtle gradients, glossy highlights, upper-left lighting, sticker-like finish, character scale, spacing, pose language, hand style, and rendering quality.
Keep the same half-lidded eye design, pupil direction, rounded cheeks, tiny nose, and visible small deadpan mouth style. Every character must have the same tiny dark deadpan mouth dash as the reference; do not cover it with beard, scarf, collar, hair, hands, or props.
Arrange all <count> characters evenly in one horizontal row on a plain white or transparent background.
Each character should face forward or turn only slightly, with shoulders, arms, tiny rounded mitten-like hands, and one small identifying prop visible.
Keep the original collection's simplicity: plainish color blocks, low decoration, minimal costume trim, no dense belts/straps/buckles, no realistic separated fingers, no oversized props.
For broad fantasy roles, express the role with one tiny prop, color, hair, or headwear cue. Do not stack job equipment; keep the base silhouette close to the reference's simple robed chibi avatars.
Characters: <compact list>.
Canvas: wide horizontal composition. If exact canvas dimensions are unsupported, preserve a wide sheet and even slot spacing.
Negative prompt: realistic, semi-realistic, painterly, 3D, pixel art, western cartoon, full body, dynamic action pose, complex background, scenery, dramatic lighting, thin outlines, inconsistent proportions, inconsistent eye pupils, missing mouth, hidden mouth, covered mouth, no mouth, skin-colored mouth, mouth only implied, blank lower face, scarf covering mouth, beard covering mouth, moustache hiding mouth, oversized props, highly detailed costumes, exaggerated emotions, open-mouth smile, shouting, duplicate characters, simple recolors, text, logo, watermark, complex belts, many straps, many buckles, armor plates, detailed bags, ropes, tools, separated fingers, realistic hands.
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
- any character has no clearly visible dark mouth mark, or the mouth is hidden by beard, moustache, scarf, collar, hair, hand, prop, book, or shield
- background removal deletes hair, hat, prop, eyes, outline, or hands
- there is text, scenery, glow, shadow, or detached effects
- style looks like anime splash art, portrait painting, 3D render, mascot sticker, or pixel art
