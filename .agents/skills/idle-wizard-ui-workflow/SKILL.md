---
name: idle-wizard-ui-workflow
description: Use as the parent workflow for any Idle Wizard UI, UX, layout, visual, popup, dialog, screen, page, button, label, flow, motion, tutorial, or haptic UI work. Coordinates impeccable, Idle Wizard consistency rules, specialist skills, docs, implementation, and QA.
---

# Idle Wizard UI Workflow

## Purpose

This is the parent skill for Idle Wizard UI work. It makes every UI task start from the same context, route through the right specialist skills, reuse local patterns, and finish with consistency checks.

## Risk Tiers And Skill Routing

Classify the request before loading UI context:

- `Tier A — focused text/data`: copy, labels, catalogue values, or definitions
  with unchanged rendering and interaction. Use the project focused fast path;
  this skill does not add UI work.
- `Tier B — local reuse/extension`: feature-local layout or pixels using an
  existing documented widget contract, with no reference target, shared
  primitive change, editor-manifest change, tutorial, or interaction-path bug.
  Use `idle-wizard-ui-consistency` and focused browser evidence.
- `Tier C — shared/new UI`: a new widget, changed shared widget contract,
  page-wide composition, dialog type, shared interaction primitive, editor
  coverage, or cross-room layout. Also use `impeccable` and `ecc-browser-qa`.
- `Tier D — parity/specialist`: visual-reference matching, tutorial/FTUE,
  haptics, tap-path bugs, release candidates, or broad consistency audits. Use
  the Tier C skills plus every matching specialist below.

Add specialist skills when the surface requires them:

- Use `idle-wizard-tutorial-ui` for tutorial, FTUE, Elara guide boxes, objective panels, target hints, tutorial overlays, action reminders, pointer cues, `data-tutorial-id`, or tutorial popup/dialog work.
- Use `idle-wizard-haptics` for haptic feedback, vibration, touch press confirmation, Capacitor Haptics, `navigator.vibrate`, or local haptic settings.
- Use `ecc-tap-path-audit` for tap, click, row, tab, popup, drag/pan, WebView, or final-state interaction issues.

For broad UI audits or design recommendations, use Tier C. A focused workflow
or performance audit may inspect these rules without loading the complete visual
catalogue.

## Required Start Context

Always read:

- `experience.md`
- `docs/ai-workflow.md`
- `docs/ui-patterns-index.md`
- the touched feature README and closest widget/source entry

For Tier B, search the routed Product Shape, Style, and widget catalogue files
for the named surface and read the matching nearby lessons. Do not load those
complete catalogues by default.

For Tier C and Tier D, additionally read:

- `PRODUCT.md`
- `DESIGN.md`
- `docs/style.md`
- the relevant full widget families in `docs/ui-patterns.md`

When the request includes a screenshot, mockup, or explicit visual-parity target, also read and follow `docs/visual-reference-qa.md`.

Before making new UI, use `docs/ui-patterns-index.md` to locate the closest
existing row, box, tab, dialog, label, progress rail, overlay, or room chrome.
Read the complete catalogue only for catalogue-wide work or when no closest
pattern can be identified.

## Widget Reuse Review

Run this review before editing product UI code:

1. Inventory every visible or interactive building block needed by the request.
2. Classify each as:
   - `reuse`: use a documented widget without changing its contract;
   - `extension`: add feature data, copy, or layout composition while preserving the widget's visuals, states, behavior, and accessibility contract;
   - `new widget`: add a primitive, compound component, scroll behavior, box/dialog type, control pattern, or meaningfully different visual/interaction variant.
3. If every item is `reuse` or `extension`, continue and record `New widgets: none`.
4. If any item is a `new widget`, define it before implementation:
   - exact widget name;
   - purpose and likely consumers;
   - closest library widget and why it cannot cover the need;
   - required default, selected/active, disabled, loading, error, empty, overflow, and reduced-motion states when applicable;
   - intended reusable API or styling contract;
   - a labeled real-app preview at the authored `390x844` surface during QA, with side-by-side variants when there is more than one option.
5. Implement the widget as a reusable project component, add it to the library in `docs/ui-patterns.md`, and include a native-pixel component crop when the full surface is too small to judge.

## Workflow

1. Classify the surface: room view, ordinary box, row/list, bottom tab, popup/dialog, tutorial, settings/personalization, top chrome, animation, or haptic feedback.
2. Run the Widget Reuse Review and record the mapping before implementation.
3. Identify the nearest existing pattern in code and docs. Do not invent a near-duplicate component when an existing pattern can be extended.
4. For reference-driven work, write the visual contract first: target state/viewport/crop plus optical centers, baselines, edge anchors, proportions, and component-specific geometry that must match.
5. Run the `idle-wizard-ui-consistency` gates before editing. Decide the room landmark, panel hierarchy, resource/action color roles, and which shared fantasy HUD skins own each surface.
6. Implement narrowly inside the owning facade/manager/component. Keep gameplay, economy, progression, and transport rules out of rendering code.
7. Open a deterministic real-app state. Add a checked-in dev UI recipe or focused harness when the surface cannot be reopened directly; do not use temporary source branches as final evidence.
8. Verify according to the tier. Tier B uses `npm run check:ui`, focused tests,
   and one authored screenshot when pixels changed. Tier C adds fitted desktop
   evidence and a native crop when geometry or optical alignment changed. Tier D
   adds the matching specialist evidence and `npm run ui:compare` for references.
9. Report the most important consistency decision, `New widgets: none` or the widgets introduced, files changed, validation, comparison evidence, and any known drift left for a later pass.

## Hard Stops

- Do not add seed, herb, potion, selling, economy, inventory, progression, or other gameplay code unless the user explicitly asks for that feature.
- Do not inflate source UI font sizes for mobile readability; fix scale/layout instead.
- Do not show advanced/future room tabs in default navigation without an explicit unlock or design decision.
- Do not add arbitrary glow, unrelated ornament, feature-local panel skins, or competing illustrated focal points. Use portrait art, gradients, resource colors, icons, and shadows only when they follow the shared fantasy HUD roles and documented widget contracts.
- Do not claim browser/manual QA unless the shared Vite server and required backend are actually up and the checked viewport is named.
- Do not claim a reference match from a full-screen thumbnail or green tests alone. Missing native-pixel crop/overlay evidence is `INCONCLUSIVE`; any named anchor mismatch is `FIX REQUIRED`.
- Do not use temporary source edits, DOM mutation, or undocumented local state as the final visual-QA setup.

## Verification Menu

- Tier A: matching focused tests only.
- Tier B: `npm run check:ui`, focused tests, and one authored `390x844`
  screenshot when pixels changed. Add fitted desktop only when containment,
  responsive behavior, room chrome, or popup bounds can change.
- Tier C: Tier B plus fitted desktop browser QA. Add a native-pixel crop for
  text/art baselines, nine-slices, asset geometry, or optical alignment. Run the
  UI editor integration coverage test only when editor manifests changed.
- Tier D: Tier C plus the matching tutorial, tap, haptic, release, or reference
  workflow. Reference work requires `npm run ui:compare`.
- Full app safety: `npm run check` only for shared/cross-feature risk or when
  focused checks expose a wider failure.
- Runtime status before browser claims: `npm run dev:status` and
  `lsof -nP -sTCP:LISTEN -iTCP:3000`.
