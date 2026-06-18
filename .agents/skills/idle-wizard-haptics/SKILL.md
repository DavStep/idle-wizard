---
name: idle-wizard-haptics
description: "Use for Idle Wizard haptic feedback work: adding, reviewing, tuning, or debugging tactile vibration feedback, Capacitor Haptics integration, navigator.vibrate fallback, local haptic settings, touch press feedback, or mobile/WebView tap confirmation."
---

# Idle Wizard Haptics

## Workflow

1. Read `AGENTS.md`, `experience.md`, `docs/ai-workflow.md`, and this skill before editing haptics.
2. For any visible settings/UI change, also use `impeccable` and follow `PRODUCT.md`, `DESIGN.md`, `docs/style.md`, and `docs/ui-patterns.md`.
3. Keep haptics app-level. Do not put vibration state in ECS gameplay, SpacetimeDB, backend profile sync, or player progression.
4. Wire tactile feedback through `src/app/haptics/HapticsFacade.js`; other features should call named facade methods, not native haptic APIs directly.
5. Prefer haptics from confirmed interactions. For touch controls, fire after `PressFeedbackManager` validates pointer release on the original target, not on raw `pointerdown`.
6. Verify with focused tests first; run broader checks when touching shared app/page lifecycle.

## Marble Master Pattern

The reference repo `rockbite/marble-master` uses this shape:

- A native `RockbiteHaptics` Capacitor plugin exposes `playConstant(durationMs, amplitude)`.
- JS checks native availability first, then falls back to browser `navigator.vibrate`.
- UI taps use a tiny `5ms` pulse at `0.5` amplitude.
- Dense gameplay collisions are throttled with an `80ms` minimum interval and queue at most one delayed pulse.
- Haptics are a device preference, default on, persisted in local storage, and not stored in player save data.
- Browser vibration is guarded by `navigator.userActivation` so non-gesture calls do not fail noisily.

For Idle Wizard, use the official `@capacitor/haptics` plugin unless there is a concrete need for a custom native constant-amplitude bridge.

## Idle Wizard Rules

- Keep default tap haptic subtle: `5ms`.
- Keep a short cooldown, currently `40ms`, to avoid double buzzes from synthetic/native click paths.
- Default haptics on, but expose a plain settings row to disable them.
- Store haptic preference under local storage only. Treat it like a device preference, not account/profile data.
- Do not add color, icons, animations, or gameplay copy just to announce haptics.
- Do not vibrate disabled, selected, locked, dragged, cancelled, or retargeted interactions.
- Do not add stronger success/error haptics unless the user explicitly asks for semantic haptic patterns.

## Implementation Map

- `src/app/haptics/HapticsFacade.js`: public entry point.
- `src/app/haptics/managers/HapticPreferenceManager.js`: local enabled preference.
- `src/app/haptics/managers/HapticPulseManager.js`: Capacitor native pulse plus web fallback.
- `src/pages/managers/PressFeedbackManager.js`: central validated tap hook.
- `src/pages/topPanel/managers/TopPanelSettingsManager.js`: settings toggle state.
- `src/pages/topPanel/managers/TopPanelViewManager.js`: plain settings row.

## Verification

- Unit-test preference persistence, native/web fallback, user-activation guard, cooldown, and press validation.
- For mobile behavior, run the shared Vite server only on `http://127.0.0.1:55173/`, then package through existing Capacitor scripts when native QA is needed.
- If the haptic dependency changes, run the relevant build or Capacitor sync path before claiming packaged Android/iOS readiness.
