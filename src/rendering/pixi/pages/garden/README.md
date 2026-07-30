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
    selectSeed, confirmCancel, confirmSwap, closeDialog
  }
}
```

The presenter owns plot rules, costs, lock reasons, messages, seed filtering,
page-level selection, and formatted copy. The renderer does not infer gameplay outcomes.
Crop names remain available to plot semantics and accessible action copy, but
the soil face intentionally renders only the plot number, upgrade stars, and
action or timer text. All text rendered directly over the soil is white with a
rounded near-black outline.
The next purchasable plot uses the shared green stacked cost button with
`Unlock` above the coin row; its affordable-action notification stays on that
button rather than the surrounding plot frame.
Plots and seed-dialog rows are keyed high-water pools. The persistent
`GardenSeedActionBar` keeps one room-level seed choice, opens the retained seed
picker, and starts every ready harvest through the gameplay facade. `Harvest
All` remains actionable when no plot is ready and reuses the shared reward
flyout for `Nothing to harvest`; its notification appears only when harvests
are ready. Empty plots show no unavailable-status label: they plant when the
selected seed stock meets the plot requirement, or emit the shared `no seed`
flyout when pressed without enough stock. Growing plots offer the existing
swap confirmation when the selected seed differs. Seed, cancel-progress, and
swap-seed dialogs are constructed on first open and retained thereafter. The
plot grid reuses `RetainedScrollArea`, so vertical drag, wheel input, release
inertia, elastic edges, resting bounds, and the overflow-only scrollbar match
the other managed station panes. It stays at a fixed scale and does not
register world pan or pinch input. Press, scrolling, modal back, and semantic
tutorial targeting all use the injected shared registries; there are no DOM
listeners or geometry queries.

The seed picker reuses the exact `RootRunInventoryChoiceList` rendered by Load
Stall: `50px` Settings-backed rows, `28px` seed-pack art, a two-line seed name
and `N Available` label, `6px` row rhythm, and the shared right-inset checkmark
for the selected seed. Its shared choice-dialog viewport keeps a 4.5-row
minimum height and top-aligns shorter lists. Do not replace it with a compact
Garden-specific row.
Open `/src/dev/uiRecipes/garden-seed-picker.html` for the deterministic,
non-persistent four-row visual-reference state.
Open `/src/dev/uiRecipes/garden-plots.html` for the deterministic,
non-persistent empty-plot state used to verify label removal and the `no seed`
press flyout. Add `?overflow=1` for the valid 12-plot state used to verify
vertical drag, wheel scrolling, the overflow-only scrollbar, and hard resting
bounds. Add `?growing=1&progress=gradient` for the four-growing-plot regression
state that verifies Garden timer rails keep their green role color even when
the player-wide progress style is gradient.

The cancel-progress confirmation uses the approved red danger title plaque,
Title Case copy, a centered prompt, a yellow `Keep` action, and a red `Empty`
action. The neutral seed-swap confirmation keeps the default title treatment.
