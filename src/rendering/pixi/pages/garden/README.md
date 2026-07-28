# Retained Pixi Garden

`createGardenPixiPage(context)` constructs the Garden page once. Pass the
shared `assetManager`, `inputRouter`, `semanticTargets`, resolved
`dialogRegistry`, `dialogLayer`, optional retained `counters`, `ticker`, and
theme snapshot. Register the returned view as page id `garden`.

The page consumes display-ready presenter data:

```js
{
  garden: {
    now,
    maxPlots,
    world: { controlled, reset, panX, panY, zoom },
    plots: [{
      id, tileNumber, soilLevel, levelLabel, starTone,
      phase, label, labelResource, actionText,
      disabled, visible, buySlot, notification,
      herbKey, plantFrame,
      progress: { durationMs, remainingMs, endTimeMs, progress },
      acceptsSeedDrop, semanticId, tutorialId,
      onActivate, onSeedDrop
    }],
    inventory: {
      activeTab: null | 'herbs' | 'seeds',
      herbs: { visible, expanded, canToggle, countText, rows },
      seeds: { visible, expanded, canToggle, countText, rows }
    },
    dialogs: {
      seed: { open, title, plot, rows: [{ id, label, quantity, onSelect }] },
      cancel: { open, title, message, confirmLabel, payload, onConfirm },
      swap: { open, title, message, confirmLabel, payload, onConfirm }
    }
  },
  actions: {
    activatePlot, activatePlotLabel, dropSeed,
    toggleInventory, toggleInventoryExpanded,
    previewSeedDrag, endSeedDrag, cancelSeedDrag,
    selectSeed, confirmCancel, confirmSwap, closeDialog,
    setWorldViewport
  }
}
```

The presenter owns plot rules, costs, lock reasons, messages, inventory
filtering, and formatted copy. The renderer does not infer gameplay outcomes.
Plots, inventory rows, and seed rows are keyed high-water pools. Seed,
cancel-progress, and swap-seed dialogs are constructed on first open and
retained thereafter. Pan, pinch, press, drag/drop, scrolling, modal back, and
semantic tutorial targeting all use the injected shared registries; there are
no DOM listeners or geometry queries.

The cancel-progress confirmation uses the approved red danger title plaque,
Title Case copy, a centered prompt, a yellow `Keep` action, and a red `Empty`
action. The neutral seed-swap confirmation keeps the default title treatment.
