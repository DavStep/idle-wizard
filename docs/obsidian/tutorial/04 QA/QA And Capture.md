---
title: QA And Capture
tags:
  - tutorial
  - qa
  - capture
status: active
world: tutorial
---

# QA And Capture

## Capture Command

Run `npm run tutorial:capture` to start the shared dev server when needed, pass
the live tutorial, and refresh PNGs plus the contact sheet.

Run `node scripts/capture-tutorial-flow.js --check` for a fast contract check
that the capture step list still follows the source graph. Default capture
records 28 of the 31 current source steps. It excludes the optional
`purchase-house`, `finish-seed-task`, and legacy balance-conditional
`fill-sage-seed-task` branches.

The adapter drives the retained Pixi fresh-start controller, intro presenter,
tutorial overlay, semantic targets, and open dialogs. Capture must stay usable
before gameplay initialization so the account-choice and story intro can be QA'd
without a pre-game snapshot crash.

## Source Assets

- Automation: `scripts/capture-tutorial-flow.js`
- Contact sheet: `docs/tutorial-flow/contact-sheet.png`
- Screenshots: `docs/tutorial-flow/screenshots/`

## Manual QA

Dev builds expose tutorial tools through `window.cheats`:

- `cheats.listTutorialStages()`
- `cheats.getTutorialGraph()`
- `cheats.loadTutorialStep("t01")`
- `cheats.loadTutorialStep("intro-garden")`

## Screenshot Checks

Check that targets stay visible, CTAs are tappable, resource text remains
readable, top/bottom chrome is coherent, and no lesson or objective box is
cropped.

Capture automation asserts that each active step target resolves to a visible,
measurable live semantic target before writing the screenshot. The full pass
also verifies account choice and story intro at `390x844` and `1800x1200`.

## Related

- [[Tutorial Source Map]]
- [[Tutorial Risks]]
