---
name: ecc-tap-path-audit
description: Use for Idle Wizard button, tap, row, tab, popup, drag/pan, tutorial target, mobile/WebView, or "button does nothing" bugs and reviews. Adapts ECC click-path-audit to trace pointer/click handler order, synthetic click dedupe, state reads/writes/resets, async refreshes, backdrop behavior, swipe blockers, and the final visible UI state promised by the control label.
---

# ECC Tap Path Audit

## Purpose

Use this ECC-derived workflow when a user-facing control might be wired correctly but still produce the wrong final state. This is especially important for Idle Wizard mobile/WebView paths where pointer drift, retargeted clicks, backdrop dedupe, snapshot refresh, or swipe capture can cancel the intended action.

Project rules and local specialist skills remain authoritative. For UI work, still use `idle-wizard-ui-workflow`; for bug reports, still use `idle-wizard-bugfixing`.

## Audit Flow

1. Identify the touchpoint:
   - Label, selector, page/room, file, manager/facade, and expected final visible state.
   - Include platform assumptions: browser, Android WebView, touch, mouse, keyboard, or tutorial-gated state.

2. Trace the event path in order:
   - `pointerdown`, `pointermove`, `pointerup`, `click`, synthetic click helpers, `data-press-start-click`, backdrop handlers, and dialog open/close paths.
   - Check page swipe blockers, scroll roots, pannable world handlers, drag thresholds, and tap slop.

3. Map state reads and writes:
   - Local manager fields, DOM flags, ECS/facade snapshots, backend rows, localStorage, timers, selected item/slot state, tutorial reveal state, and popup state.
   - Mark any call that resets state it does not clearly own.

4. Check final-state conflicts:
   - Sequential undo: later call resets earlier action.
   - Async race: refresh, timer, backend echo, or animation end rewrites newer state.
   - Snapshot replacement: focused inputs, scroll panes, dialogs, or selected rows are remounted.
   - Backdrop collision: the same tap opens and closes a popup.
   - Retargeted WebView click: release lands on a new or parent element.
   - Swipe/scroll capture: horizontal/vertical gesture steals a tap.
   - Tutorial reveal gate: visible controls remain untappable or hidden controls are targetable.
   - Disabled mismatch: `.is-locked` or visual state diverges from actual click handling.

5. Prove the result:
   - Prefer a focused test, DOM harness, browser click QA, or screenshot evidence.
   - If the trace is source-only, label the evidence as inferred and do not overstate runtime QA.

## Report Shape

```markdown
Tap Path Audit
- Touchpoint:
- Expected final state:
- Handler/event trace:
- State reads/writes/resets:
- Conflict pattern:
- Evidence:
- Fix direction:
```
