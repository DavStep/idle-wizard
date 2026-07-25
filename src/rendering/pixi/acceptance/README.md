# Retained Pixi acceptance gate

`RetainedModeCompletionGate.test.js` is the cross-page lifecycle guard for the
seven production room pages. It uses the real page and dialog classes with the
existing Pixi test asset/canvas harness.

The suite proves that, after two-key warm-up:

- every page remains the original eager instance through repeated bind and
  activate/deactivate cycles;
- every registered page-owned dialog is built on first open only and then
  retained;
- page rows, dialog rows, nested collections, and their widget pools reuse the
  same instances without allocating beyond the established high-water mark;
- closed dialogs and inactive pages leave no modal, live subscription, ticker
  callback, or available input target behind;
- the installed input registrations remain stable while retained, then fully
  unregister at application shutdown.

Run it with:

```sh
npx vitest run src/rendering/pixi/acceptance --reporter=dot
```

This is a lifecycle/allocation gate. Native-pixel visual parity, Android input,
and frame-time or texture-memory profiling remain separate release gates.
