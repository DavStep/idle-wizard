---
name: ecc-browser-qa
description: Use for Idle Wizard browser QA after UI, layout, tutorial, interaction, popup, page, release-candidate, or bug-fix changes that need live verification. Adapts ECC browser-qa with project-specific runtime checks, console/network smoke, desktop and authored 1080x2170 screenshots, interaction checks, accessibility sanity checks, and an INCONCLUSIVE verdict when no visual baseline or screenshot evidence exists.
---

# ECC Browser QA

## Purpose

Use this ECC-derived workflow to verify that changed UI actually works in the browser. This skill adds browser QA discipline only; `AGENTS.md`, `experience.md`, `docs/ai-workflow.md`, `idle-wizard-ui-workflow`, `idle-wizard-tutorial-ui`, and `idle-wizard-bugfixing` remain authoritative.

Do not run mutating production journeys. Use local or staging targets unless the user explicitly asks for production smoke and the journey is read-only.

## Runtime Gate

Before claiming live browser QA:

- Check Vite with `npm run dev:status`; reuse `http://127.0.0.1:55173/`.
- Check SpacetimeDB with `lsof -nP -sTCP:LISTEN -iTCP:3000` when the app flow needs backend state.
- Do not start alternate Vite ports.
- Wait for app-level gates to clear before trusting screenshots or DOM checks, especially `.app-online-gate[hidden]`.

## QA Phases

1. Smoke:
   - Load the target page or room.
   - Capture console errors and failed network requests.
   - Treat app crash, blank stage, persistent online gate, or unexpected 4xx/5xx as blocking.

2. Screenshot:
   - Capture authored mobile surface `1080x2170`.
   - Capture a fitted desktop viewport.
   - Verify no text overlap, clipping, off-stage popup, incorrect source scale, or room chrome collision.
   - If no relevant screenshot or visual baseline exists, report `INCONCLUSIVE`, not `PASS`.

3. Interaction:
   - Exercise changed buttons, taps, tabs, popups, drag/pan surfaces, forms, and tutorial targets.
   - Verify the final visible state matches the user-facing label or promise.
   - For tap/button regressions, also use `ecc-tap-path-audit`.

4. Accessibility sanity:
   - Check focus, labels, `aria-live`/status updates, icon-only labels, dialog focus restoration, and keyboard operability where web users can interact.
   - For motion changes, confirm reduced-motion handling or explain why no animation path is affected.

5. Report:
   - Include URL, viewport(s), runtime status, smoke result, interaction result, screenshot evidence, and verdict.
   - Verdicts: `PASS`, `FIX REQUIRED`, or `INCONCLUSIVE`.

## Report Shape

```markdown
Browser QA
- Target:
- Runtime: Vite 55173 [up/down], SpacetimeDB 3000 [up/down/not needed]
- Viewports:
- Smoke:
- Interactions:
- Visual evidence:
- Accessibility sanity:
- Verdict:
- Follow-ups:
```
