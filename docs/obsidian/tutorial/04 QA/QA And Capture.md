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
records 36 current-balance steps and excludes the legacy balance-conditional
`fill-sage-seed-task` branch.

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
measurable live `data-tutorial-id` before writing the screenshot.

## Related

- [[Tutorial Source Map]]
- [[Tutorial Risks]]
