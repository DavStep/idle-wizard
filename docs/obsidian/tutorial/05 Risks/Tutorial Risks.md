---
title: Tutorial Risks
tags:
  - tutorial
  - risk
status: active
world: tutorial
---

# Tutorial Risks

## Visual Reference Drift

The screenshot table and contact sheet in `docs/tutorial-flow.md` cover the
current 28-step default capture. Run
`node scripts/capture-tutorial-flow.js --check` after graph edits, then refresh
the real-game images with `npm run tutorial:capture`.

## Balance Drift

Tutorial step `fill-sage-seed-task` is balance-dependent. The source graph notes
that default `tasks.json` no longer includes a level-3 sage seed turn-in. Default
capture treats it as a legacy optional branch instead of forcing the removed
task back into balance.

## Target Drift

Tutorial guidance depends on live `data-tutorial-id` placement. Moving a button,
row label, tab, or popup action can silently break guidance even if the tutorial
logic still advances. Capture now asserts each active target resolves to a
visible, measurable live element before writing a screenshot.

## Surface Stacking

Blocking gates, room popups, announcements, and tutorial lessons can overlap if
target blockers are not kept current. New blocker surfaces should mark their
visible root with `data-tutorial-blocker="true"` so tutorial guidance pauses
without depending on class-name patterns.

## Related

- [[Target And Reveal Rules]]
- [[QA And Capture]]
