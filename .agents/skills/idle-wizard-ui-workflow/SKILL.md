---
name: idle-wizard-ui-workflow
description: Use as the parent workflow for any Idle Wizard UI, UX, layout, visual, popup, dialog, screen, page, button, label, flow, motion, tutorial, or haptic UI work. Coordinates impeccable, Idle Wizard consistency rules, specialist skills, docs, implementation, and QA.
---

# Idle Wizard UI Workflow

## Purpose

This is the parent skill for Idle Wizard UI work. It makes every UI task start from the same context, route through the right specialist skills, reuse local patterns, and finish with consistency checks.

## Skill Routing

Always use these skills for Idle Wizard UI work:

1. `impeccable` for interface critique, layout judgment, hierarchy, accessibility, responsive behavior, and browser/screenshot iteration.
2. `idle-wizard-ui-consistency` for local style law and drift checks.

Add specialist skills when the surface requires them:

- Use `idle-wizard-tutorial-ui` for tutorial, FTUE, Elara guide boxes, objective panels, target hints, tutorial overlays, action reminders, pointer cues, `data-tutorial-id`, or tutorial popup/dialog work.
- Use `idle-wizard-haptics` for haptic feedback, vibration, touch press confirmation, Capacitor Haptics, `navigator.vibrate`, or local haptic settings.

If the task is only an audit or recommendation, still use `impeccable` and `idle-wizard-ui-consistency`.

## Required Start Context

Read these before project decisions:

- `experience.md`
- `PRODUCT.md`
- `DESIGN.md`
- `docs/style.md`
- `docs/ui-patterns.md`
- `docs/ai-workflow.md`

Before making new UI, inspect existing similar rows, boxes, tabs, dialogs, labels, progress rails, overlays, or room chrome and reuse the closest pattern.

## Workflow

1. Classify the surface: room view, ordinary box, row/list, bottom tab, popup/dialog, tutorial, settings/personalization, top chrome, animation, or haptic feedback.
2. Identify the nearest existing pattern in code and docs. Do not invent a near-duplicate component when an existing pattern can be extended.
3. Run the `idle-wizard-ui-consistency` gates before editing. Decide which parts must stay monochrome/default and which are allowed exceptions.
4. Implement narrowly inside the owning facade/manager/component. Keep gameplay, economy, progression, and transport rules out of rendering code.
5. Verify with `npm run check:ui`, focused tests for touched code, and screenshots when visible UI changes.
6. Report the most important consistency decision, files changed, validation, and any known drift left for a later pass.

## Hard Stops

- Do not add seed, herb, potion, selling, economy, inventory, progression, or other gameplay code unless the user explicitly asks for that feature.
- Do not inflate source UI font sizes for mobile readability; fix scale/layout instead.
- Do not show advanced/future room tabs in default navigation without an explicit unlock or design decision.
- Do not apply dialog shadows, portrait art, gradients, resource color systems, or icon-heavy composition to ordinary default boxes.
- Do not claim browser/manual QA unless the shared Vite server and required backend are actually up and the checked viewport is named.

## Verification Menu

Use the smallest set that matches risk:

- Static UI consistency: `npm run check:ui`
- Full app safety: `npm run check`
- Focused tests: `npm test -- <path-or-pattern>`
- Runtime status: `npm run dev:status` and `lsof -nP -sTCP:LISTEN -iTCP:3000`
- Screenshot QA: authored `1080x2170` plus fitted desktop viewport for changed visible UI
