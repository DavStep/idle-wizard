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
3. `ecc-browser-qa` when visible UI work needs browser smoke, screenshot, interaction, or accessibility evidence.

Add specialist skills when the surface requires them:

- Use `idle-wizard-tutorial-ui` for tutorial, FTUE, Elara guide boxes, objective panels, target hints, tutorial overlays, action reminders, pointer cues, `data-tutorial-id`, or tutorial popup/dialog work.
- Use `idle-wizard-haptics` for haptic feedback, vibration, touch press confirmation, Capacitor Haptics, `navigator.vibrate`, or local haptic settings.
- Use `ecc-tap-path-audit` for tap, click, row, tab, popup, drag/pan, WebView, or final-state interaction issues.

If the task is only an audit or recommendation, still use `impeccable` and `idle-wizard-ui-consistency`.

## Required Start Context

Read these before project decisions:

- `experience.md`
- `PRODUCT.md`
- `DESIGN.md`
- `docs/style.md`
- `docs/ui-patterns.md`
- `docs/ai-workflow.md`

When the request includes a screenshot, mockup, or explicit visual-parity target, also read and follow `docs/visual-reference-qa.md`.

Before making new UI, inspect existing similar rows, boxes, tabs, dialogs, labels, progress rails, overlays, or room chrome and reuse the closest pattern.

## Workflow

1. Classify the surface: room view, ordinary box, row/list, bottom tab, popup/dialog, tutorial, settings/personalization, top chrome, animation, or haptic feedback.
2. Identify the nearest existing pattern in code and docs. Do not invent a near-duplicate component when an existing pattern can be extended.
3. For reference-driven work, write the visual contract first: target state/viewport/crop plus optical centers, baselines, edge anchors, proportions, and component-specific geometry that must match.
4. Run the `idle-wizard-ui-consistency` gates before editing. Decide which parts must stay monochrome/default and which are allowed exceptions.
5. Implement narrowly inside the owning facade/manager/component. Keep gameplay, economy, progression, and transport rules out of rendering code.
6. Open a deterministic real-app state. Add a checked-in dev UI recipe or focused harness when the surface cannot be reopened directly; do not use temporary source branches as final evidence.
7. Verify with `npm run check:ui`, focused tests, full-view screenshots, a native-pixel close crop, and `npm run ui:compare` when a visual reference exists. Iterate until every contract item has a parity verdict.
8. Report the most important consistency decision, files changed, validation, comparison evidence, and any known drift left for a later pass.

## Hard Stops

- Do not add seed, herb, potion, selling, economy, inventory, progression, or other gameplay code unless the user explicitly asks for that feature.
- Do not inflate source UI font sizes for mobile readability; fix scale/layout instead.
- Do not show advanced/future room tabs in default navigation without an explicit unlock or design decision.
- Do not apply dialog shadows, portrait art, gradients, resource color systems, or icon-heavy composition to ordinary default boxes.
- Do not claim browser/manual QA unless the shared Vite server and required backend are actually up and the checked viewport is named.
- Do not claim a reference match from a full-screen thumbnail or green tests alone. Missing native-pixel crop/overlay evidence is `INCONCLUSIVE`; any named anchor mismatch is `FIX REQUIRED`.
- Do not use temporary source edits, DOM mutation, or undocumented local state as the final visual-QA setup.

## Verification Menu

Use the smallest set that matches risk:

- Static UI consistency: `npm run check:ui`
- Full app safety: `npm run check`
- Focused tests: `npm test -- <path-or-pattern>`
- Runtime status: `npm run dev:status` and `lsof -nP -sTCP:LISTEN -iTCP:3000`
- Screenshot QA: `ecc-browser-qa` with authored `1080x2170` plus fitted desktop viewport for changed visible UI
- Reference fidelity: native-pixel close crop plus `npm run ui:compare -- --reference ... --actual ...`
