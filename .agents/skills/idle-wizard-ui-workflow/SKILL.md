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

Before making new UI, inspect the reusable widget library in `docs/ui-patterns.md` plus existing similar rows, boxes, tabs, dialogs, labels, progress rails, overlays, or room chrome and reuse the closest pattern.

## Widget Admission Gate

Run this gate before editing product UI code:

1. Inventory every visible or interactive building block needed by the request.
2. Classify each as:
   - `reuse`: use a documented widget without changing its contract;
   - `extension`: add feature data, copy, or layout composition while preserving the widget's visuals, states, behavior, and accessibility contract;
   - `new widget`: add a primitive, compound component, scroll behavior, box/dialog type, control pattern, or meaningfully different visual/interaction variant.
3. If every item is `reuse` or `extension`, continue and record `New widgets: none`.
4. If any item is a `new widget`, pause before product code, generated asset, or runtime binding changes. Ask the user to approve one batched proposal containing:
   - exact widget name;
   - purpose and likely consumers;
   - closest library widget and why it cannot cover the need;
   - required default, selected/active, disabled, loading, error, empty, overflow, and reduced-motion states when applicable;
   - intended reusable API or styling contract;
   - a labeled visual preview at the authored `390x844` surface, with side-by-side variants when there is more than one option.
5. Deliver the preview as a visible image or rendered artifact, not only a prose description or ASCII wireframe. Include a native-pixel component crop when the full surface is too small to judge. A labeled contact sheet may cover the whole batch.
6. Build proposal previews as disposable design artifacts outside product runtime code. Do not count a temporary preview as implementation.
7. Wait for explicit approval of each named widget. Approval of the overall screen does not approve unlisted widget dependencies; if implementation discovers another new widget, pause and amend the proposal.
8. Implement only the widgets the user approves. Reuse approved names and contracts, add each widget to the library in `docs/ui-patterns.md`, and replace proposal-only evidence with a real-app screenshot during QA.

Batch all proposed widgets for the current task into one approval request. Do not drip-feed predictable dependencies in separate requests.

## Workflow

1. Classify the surface: room view, ordinary box, row/list, bottom tab, popup/dialog, tutorial, settings/personalization, top chrome, animation, or haptic feedback.
2. Run the Widget Admission Gate and receive approval for every proposed new widget before implementation.
3. Identify the nearest existing pattern in code and docs. Do not invent a near-duplicate component when an existing pattern can be extended.
4. For reference-driven work, write the visual contract first: target state/viewport/crop plus optical centers, baselines, edge anchors, proportions, and component-specific geometry that must match.
5. Run the `idle-wizard-ui-consistency` gates before editing. Decide the room landmark, panel hierarchy, resource/action color roles, and which shared fantasy HUD skins own each surface.
6. Implement narrowly inside the owning facade/manager/component. Keep gameplay, economy, progression, and transport rules out of rendering code.
7. Open a deterministic real-app state. Add a checked-in dev UI recipe or focused harness when the surface cannot be reopened directly; do not use temporary source branches as final evidence.
8. Verify with `npm run check:ui`, focused tests, full-view screenshots, a native-pixel close crop, and `npm run ui:compare` when a visual reference exists. Iterate until every contract item has a parity verdict.
9. Report the most important consistency decision, `New widgets: none` or the approved widgets introduced, files changed, validation, comparison evidence, and any known drift left for a later pass.

## Hard Stops

- Do not add seed, herb, potion, selling, economy, inventory, progression, or other gameplay code unless the user explicitly asks for that feature.
- Do not inflate source UI font sizes for mobile readability; fix scale/layout instead.
- Do not show advanced/future room tabs in default navigation without an explicit unlock or design decision.
- Do not add arbitrary glow, unrelated ornament, feature-local panel skins, or competing illustrated focal points. Use portrait art, gradients, resource colors, icons, and shadows only when they follow the shared fantasy HUD roles and approved widget contracts.
- Do not claim browser/manual QA unless the shared Vite server and required backend are actually up and the checked viewport is named.
- Do not claim a reference match from a full-screen thumbnail or green tests alone. Missing native-pixel crop/overlay evidence is `INCONCLUSIVE`; any named anchor mismatch is `FIX REQUIRED`.
- Do not use temporary source edits, DOM mutation, or undocumented local state as the final visual-QA setup.
- Do not implement or integrate an unapproved new widget. A mockup used only to request approval is not permission to add it to product code.

## Verification Menu

Use the smallest set that matches risk:

- Static UI consistency: `npm run check:ui`
- Full app safety: `npm run check`
- Focused tests: `npm test -- <path-or-pattern>`
- Runtime status: `npm run dev:status` and `lsof -nP -sTCP:LISTEN -iTCP:3000`
- Screenshot QA: `ecc-browser-qa` with authored `390x844` plus fitted desktop viewport for changed visible UI
- Reference fidelity: native-pixel close crop plus `npm run ui:compare -- --reference ... --actual ...`
