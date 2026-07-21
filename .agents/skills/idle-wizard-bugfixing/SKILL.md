---
name: idle-wizard-bugfixing
description: Use for Idle Wizard bug reports, regressions, failing checks, broken gameplay/UI/backend behavior, mobile/WebView defects, save/load mismatches, visual defects, and vague "X is broken" requests. Requires reproduction first, root-cause isolation, regression learning, a narrow fix, and validation against the original reproduction.
---

# Idle Wizard Bugfixing

## Purpose

Use this skill to turn a bug report into a verified fix. The flow must produce clear reproduction evidence, identify the exact failure path, fix the smallest responsible code, and validate that the original issue no longer reproduces.

This skill adds bug discipline only. Still follow all project rules from `AGENTS.md`, `experience.md`, and `docs/ai-workflow.md`. If the bug touches UI, tutorial, haptics, backend, Android, or release behavior, also follow the required specialist workflow for that surface.

## Required Start Context

Read before project decisions:

- `AGENTS.md`
- `experience.md`
- `docs/ai-workflow.md`
- Feature-local `README.md` or nearest docs for the touched flow

Read additional docs only when the bug surface requires them, such as `docs/style.md` and `docs/ui-patterns.md` for UI defects.

## Reproduction First

Start by converting the report into reproduction steps.

Capture:

- Trigger action sequence
- Page/screen, save/progression state, account/backend state, viewport/device, and platform when relevant
- Expected behavior in one sentence
- Actual behavior in one sentence
- Evidence level: `confirmed`, `test/log confirmed`, or `inferred from source`

Prefer a confirmed local repro before editing. If the bug cannot be reproduced locally but logs, tests, screenshots, or source tracing show a deterministic failure, label that evidence clearly and continue from that proof. If expected behavior is unclear gameplay/product behavior, ask before changing rules.

## Root-Cause Isolation

Pinpoint the smallest responsible path before fixing.

1. Trace from the reproduced symptom to the owning facade, manager, reducer, ECS system, renderer, or helper.
2. Identify the first wrong state, event, DOM output, backend row, saved value, or calculation.
3. Check whether recent changes likely introduced it with `git log`, `git blame`, focused tests, or nearby diffs when useful.
4. Explain why the implementation allowed the bug: missing guard, stale state, bad ownership boundary, async race, layout math error, mismatched frontend/backend mirror, missing migration, or wrong assumption.

Do not patch broad symptoms while the failure point is still unknown unless the only safe step is adding diagnostics or a failing regression test.

## Regression Guard

Add the smallest guard that would have caught the bug when practical:

- Focused unit/integration test for logic, ECS, reducers, persistence, pricing, timers, or facades
- UI test, reproducible harness/dev-surface assertion, screenshot/click QA, or DOM metric check for visual and interaction defects. For reference-parity bugs, follow `docs/visual-reference-qa.md`; a CSS token assertion alone cannot guard optical alignment or composition.
- Manual reproduction checklist only when automation would be misleading or too costly for the change

Use `ecc-ai-regression-testing` to choose the guard shape. For tap, button, row, popup, tutorial-target, or mobile/WebView interaction bugs, also use `ecc-tap-path-audit` before deciding the fix.

Keep the guard close to the broken behavior. Avoid broad snapshot churn.

## Fix

Fix narrowly in the owning module.

- Reuse existing project helpers, managers, facades, UI patterns, and tests.
- Keep gameplay rules out of rendering code and SpacetimeDB transport out of gameplay features.
- Do not add unrelated features, refactors, cleanup, or new abstractions while fixing a bug.
- Preserve user changes in the worktree; do not revert unrelated files.

## Validate

Validate in this order:

1. Re-run the original reproduction steps or the exact failing test/log path.
2. Run the new or updated regression guard.
3. Run the smallest broader check needed by risk:
   - Focused logic change: matching `*.test.js`
   - Shared gameplay, backend, persistence, or page behavior: `npm run check`
   - UI/layout/tutorial change: focused tests plus browser screenshot/click QA at authored `1080x2170` and fitted desktop; use `ecc-browser-qa` for browser evidence and verdicts. Reference-driven fixes additionally require a native-pixel close crop and side-by-side/overlay comparison.
   - Backend schema/config change: local build/publish, `npm run stdb:generate`, and no manual generated binding edits

Do not claim browser/manual QA unless Vite `55173` and required SpacetimeDB `3000` status checks pass.

## Learn

Update `experience.md` only when the root cause teaches a durable lesson future agents should know. Keep the entry short, categorized, and specific. Do not add ordinary progress notes.

Good lesson shape:

- `Popup forms in snapshot-rendered managers need local drafts captured before replacing content; timer refreshes otherwise clear focused fields.`

Skip the lesson when the bug is local, obvious, already covered, or unlikely to recur.

## Final Report

Report:

- Reproduction evidence used
- Root cause
- Fix summary
- Validation run and result
- Any `experience.md` lesson added or why none was needed
