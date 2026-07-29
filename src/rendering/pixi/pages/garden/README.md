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
      toolbarSeedItemTypeId, semanticId, tutorialId,
      onActivate
    }],
    actionBar: {
      selectedSeed: null | {
        itemTypeId, key, label, quantity,
        icon: { kind: 'seed', key }
      },
      readyHarvestCount,
      hasSeedChoices
    },
    dialogs: {
      seed: {
        open, title,
        rows: [{
          id, label, detail, quantity, selected,
          icon, semanticId, tutorialId, onSelect
        }]
      },
      cancel: { open, title, message, confirmLabel, payload, onConfirm },
      swap: { open, title, message, confirmLabel, payload, onConfirm }
    }
  },
  actions: {
    activatePlot, activatePlotLabel,
    openSeedPicker, harvestAll,
    selectSeed, confirmCancel, confirmSwap, closeDialog,
    setWorldViewport
  }
}
```

The presenter owns plot rules, costs, lock reasons, messages, seed filtering,
page-level selection, and formatted copy. The renderer does not infer gameplay outcomes.
The next purchasable plot uses the shared green stacked cost button with
`Unlock` above the coin row; its affordable-action notification stays on that
button rather than the surrounding plot frame.
Plots and seed-dialog rows are keyed high-water pools. The persistent
`GardenSeedActionBar` keeps one room-level seed choice, opens the retained seed
picker, and starts every ready harvest through the gameplay facade. Empty plots
plant the selected seed when pressed; growing plots offer the existing swap
confirmation when the selected seed differs. Seed, cancel-progress, and
swap-seed dialogs are constructed on first open and retained thereafter. Pan,
pinch, press, scrolling, modal back, and semantic tutorial targeting all use
the injected shared registries; there are no DOM listeners or geometry queries.

The seed picker reuses the exact `RootRunInventoryChoiceList` rendered by Load
Stall: `50px` Settings-backed rows, `28px` seed-pack art, a two-line seed name
and `N Available` label, `6px` row rhythm, and the shared right-inset checkmark
for the selected seed. Do not replace it with a compact Garden-specific row.
Open `/src/dev/uiRecipes/garden-seed-picker.html` for the deterministic,
non-persistent four-row visual-reference state.

The cancel-progress confirmation uses the approved red danger title plaque,
Title Case copy, a centered prompt, a yellow `Keep` action, and a red `Empty`
action. The neutral seed-swap confirmation keeps the default title treatment.
