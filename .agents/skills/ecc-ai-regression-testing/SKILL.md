---
name: ecc-ai-regression-testing
description: Use after finding or fixing an Idle Wizard bug, regression, backend/frontend mismatch, save/load issue, UI tap defect, tutorial defect, or AI-assisted code change that needs a focused guard. Adapts ECC ai-regression-testing by turning real bugs into small Vitest, DOM, screenshot, capture, backend, or manual reproduction guards rather than chasing arbitrary coverage.
---

# ECC AI Regression Testing

## Purpose

Use this ECC-derived workflow to prevent known bug classes from returning. It complements `idle-wizard-bugfixing`; it does not replace reproduction, root-cause isolation, or project-specific validation.

## Guard Selection

Choose the smallest guard that would have caught the actual failure:

- Pure gameplay/ECS/facade logic: focused Vitest near the owning manager or facade.
- Backend reducer/config/schema behavior: focused backend or mirrored frontend/backend test; regenerate bindings only when schema changed.
- Save/load/migration behavior: load, migrate, normalize, and persistence tests that include the affected branch.
- UI rendering/layout: DOM metric check, focused renderer test, `npm run check:ui`, or screenshot QA.
- Tap/button/mobile/WebView behavior: combine a focused source guard with `ecc-tap-path-audit` and browser click QA when practical.
- Tutorial/FTUE behavior: focused tutorial manager tests plus tutorial screenshot/click QA.
- Release/deploy regression: `ecc-canary-watch` plus the relevant build or asset check.

## Regression Workflow

1. State the bug in one sentence and name the first wrong state/output.
2. Add or update a guard that fails for that exact bug when practical.
3. Prefer RED evidence before changing production code. If RED is impossible or too costly, explain why and still add the closest deterministic guard.
4. Fix narrowly in the owning module.
5. Rerun the guard and the smallest broader project check required by `docs/ai-workflow.md`.
6. Report the guard path, command, result, and remaining manual-only risk.

## AI Blind Spots To Check

- Frontend/backend mirror drift: pricing, demand, task config, save normalization, timer math, or world event logic differs across copies.
- Production/local/default path drift: embedded defaults, backend config rows, local QA saves, and client fallbacks disagree.
- Response or snapshot shape drift: UI expects a field that migration, normalization, subscription, or backend rows omit.
- Stale state leakage: error/cancel/completion paths leave old DOM, selected slot, scroll, focus, timer, or tutorial reveal state alive.
- Optimistic or local state update lacks rollback or is overwritten by the next snapshot.
- Test only proves the helper, not the user-visible behavior that failed.

## Report Shape

```markdown
Regression Guard
- Bug:
- First wrong state/output:
- Guard:
- RED evidence:
- GREEN evidence:
- Broader validation:
- Remaining risk:
```
