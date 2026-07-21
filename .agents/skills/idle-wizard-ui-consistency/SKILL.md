---
name: idle-wizard-ui-consistency
description: Use for Idle Wizard UI consistency audits and implementation checks, including style drift, pattern reuse, visual hierarchy, typography, spacing, motion, default room chrome, tutorial surface alignment, and new UI surfaces.
---

# Idle Wizard UI Consistency

## Purpose

This is the local style law for Idle Wizard UI. Use it before accepting any UI as consistent with the project, whether the task is a review, a fix, or new UI creation.

## Required Context

Read these before deciding if a UI is consistent:

- `experience.md`
- `PRODUCT.md`
- `DESIGN.md`
- `docs/style.md`
- `docs/ui-patterns.md`
- `docs/ai-workflow.md`

If the task is an audit or visual cleanup, also read the latest relevant file under `.impeccable/critique/` when present.

## Consistency Gates

- Default room navigation is five bottom tabs: `brewing`, `garden`, `workshop`, `research`, and `market`. Advanced, guild, prestige, and future tabs need an explicit unlock or redesign surface before they appear in default chrome.
- Ordinary non-dialog panels use `style-box`: white theme gets `1px` borders, non-white themes get `2px` borders, compact padding, no shadow.
- Popup and modal panels use `style-dialog`: strong border, `20px` dialog padding, and the bottom-right dialog shadow. Do not copy dialog weight into ordinary boxes.
- Typography stays source-scale: `13px` body text, `14px` dialog titles, `11px` border labels, and no direct font inflation for mobile readability.
- A Dark Room-style block titles are embedded over the top border on a white background. Do not add separate headings inside bordered panels when the border-label pattern fits.
- Rows keep the project rhythm: left number or marker, middle text/content, fixed right action or status. Avoid row layouts that introduce icon-first scanning unless the feature explicitly owns iconography.
- Default visual language is monochrome: black text, white surfaces, serif text, thin black borders, almost no decoration. Gradients, resource colors, large icons, portrait art, glow, and character-heavy treatment are exceptions for explicit customization/profile/tutorial contexts, not the default state.
- Top chrome is text-first and quiet. Avatar, coin, and icon affordances must not dominate the default room surface.
- Resource icons align to the visible numeral/text ink, not merely the flex line box. Verify their optical vertical centers and the intended value-to-icon gap in a close crop.
- Text over illustrated badges centers against the asset's visible alpha bounds. Transparent padding is not a valid centering box; document any optical nudge with screenshot evidence.
- When character art is intended to ground on a panel, its visible alpha edge must meet the specified panel edge. Centering the image canvas inside the grid is not equivalent.
- Reference-driven progress rails must match the named geometry separately: outer stroke, track color, inner inset, fill thickness, end-cap shape, divider count/positions, and caption alignment. A generic segmented rail is not parity.
- Tutorial UI must also use `idle-wizard-tutorial-ui`; that skill owns tutorial box placement, collision, stacking, pointer cues, and screenshot QA.
- Motion is subtle, stateful, and reduced-motion compatible. Prefer opacity and transform. Treat width, height, margin, padding, bounce, overshoot, and elastic easing as drift unless the task explicitly requires them.
- The authored viewport is `1080x2170`. UI should scale from that logical surface without changing the authored layout.
- Page names sit bottom center of the room view. Do not duplicate page identity through extra top headings.
- The Workshop resource/action block is `mana sphere`; the summon seed button sits outside it; clicking `seeds` opens seed inventory breakdown.

## Audit Output

When reviewing UI consistency, report:

1. Most inconsistent UI elements, with file or screenshot evidence.
2. Most consistent UI elements, so future work can copy them.
3. Concrete fixes in priority order.
4. Verification performed and any remaining risk.

## Verification

For UI implementation changes, run:

- `npm run check:ui`
- Focused tests for touched managers/components.
- Screenshot QA at the authored `1080x2170` surface and at a fitted desktop viewport when runtime UI is affected.
- For visual-reference work, follow `docs/visual-reference-qa.md`, inspect a native-pixel close crop, and generate the `npm run ui:compare` side-by-side/overlay artifact.

Use `npm run check:ui -- --strict` only when the branch is ready to fail on all currently detected drift.
