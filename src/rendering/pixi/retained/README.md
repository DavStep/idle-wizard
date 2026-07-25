# Retained Pixi UI Infrastructure

This folder contains renderer-only lifecycle and reuse infrastructure. It does
not own gameplay rules, backend calls, DOM nodes, or visual styling.

## View lifecycle

Pages are eager instances registered with `PageRegistry`. Activating another
page deactivates the current page without destroying it. Dialog factories are
registered with `DialogRegistry`; each factory runs only on that dialog's first
open, and the instance is retained after close.

Both registries require the same view contract:

```js
{
  bind(viewModel) {},
  applyTheme(themeSnapshot) {},
  layout(viewportProjection) {},
  activate() {},
  deactivate() {},
  destroy() {},
}
```

`destroy()` is reserved for application shutdown.

## Repeated content

`WidgetPool` owns widget allocations and enforces one reset per release.
`PooledCollection` keeps widget identity stable by item key across updates and
reorders. A pool's `maxSize` is its retained idle limit; active demand is never
silently discarded.

Poolable widgets must remove bound data, semantic targets, ticker work, and
interactive event mode in `reset()`. Event handlers should be installed once in
the widget constructor, not during `bind()`.

## Semantic targets and diagnostics

`SemanticTargetRegistry` maps stable semantic/tutorial ids to Pixi display
objects, dynamic bounds/state providers, and action callbacks. It deliberately
does not query DOM geometry.

Pass one `RetainedUiCounters` instance to registries and pools in development or
tests to count lifecycle events and allocations. Per-pool and per-registry live
sizes and high-water marks are available through `getStats()`.
