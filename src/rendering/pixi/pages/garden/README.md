# Retained Pixi Garden

`createGardenPixiPage(context)` constructs the Garden page once. Pass the
shared `assetManager`, `inputRouter`, `semanticTargets`, resolved
`dialogRegistry`, `dialogLayer`, optional retained `counters`, `ticker`, and
theme snapshot. Register the returned view as page id `garden`.

Nine warm fireflies drift behind the plot grid and action bar. They reuse the
shared retained ambient layer, animate only while Garden is active, dim in Day,
and settle into a static constellation when reduced motion is requested.

The room identity is the shared full-width title-only ribbon in its green
semantic skin. It renders `Garden` without rank-star slots above the plot grid.

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
      automationAvailable, autoEnabled,
      automationSeed, plantQuantity, maxPlantQuantity, harvestQuantity,
      progress: { durationMs, remainingMs, endTimeMs, progress },
      toolbarSeedItemTypeId, semanticId, tutorialId,
      onActivate
    }],
    actionBar: {
      canPlantAll,
      canHarvestAll,
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
    openSeedPicker, openPlotSeedPicker, plantAll, harvestAll,
    togglePlotAutomation, selectPlotQuantity,
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
Completing a plot's combined automation research replaces that plot's compact
grid cell with the production-backed Automated Garden Plot variant. Its long
soil starts at the first normal plot's visible left edge, covers roughly two
and a half plots, and renders the committed crop as one through five plant
instances. A right-side `70x78px` control block ends at the third normal plot's
visible right edge: the seed selector spans its top, with Brewing-sized
`32x36px` Auto and `xN` controls below it and `6px` gaps. Their invisible tap
targets remain `44px`. The progress rail stays directly beneath the soil. The
fill is green while growing and yellow while harvesting. The
seed icon sets that plot's future crop, Auto toggles the
existing combined plant/harvest loop, and `xN` cycles through the researched
plot multiplier for the next crop; the active crop keeps its committed count.
The seed selector raises the seed pack above its compact selected-seed name;
the lower `xN` label uses the same optical face center as the shared button
skin rather than the raw image bounds.
Automated plants sit `2px` higher than the manual baseline. The committed crop
forms one evenly spaced group centered on the long soil for every count from one
through five, with stable per-plot/per-slot vertical variation of up to `1px` so
the bed looks organic without breaking horizontal symmetry or jittering across
ticks and rebinds.
Accepted timer-reduction taps resolve the nearest visible herb from the release
point and animate only that herb's snap, spark burst, and removed-time label;
the other herbs and soil stay still while the plot-wide cooldown remains active.
Legacy saves keep Auto on and default `xN` to the current multiplier. Mixed
manual and automated plots lay out in source order; each automated plot takes a
complete row and the next manual plot resumes the three-column grid below it.
Plots and seed-dialog rows are keyed high-water pools. The persistent
`GardenSeedActionBar` keeps one room-level seed choice and opens the retained
seed picker. Its researched `Plant All` and `Harvest All` actions reuse the
green shared button skin. The yellow `Seeds` picker combines its action and
selection in one `36px` control: selected state adds the seed-pack art plus a
compact `<seed> · <owned>` line, while empty state keeps the centered `Seeds`
label. Before bulk actions unlock, the lone picker stays centered at a long
`220px` source width instead of spanning the row. With multiple visible
actions, the controls divide the row evenly. `Plant All` plants the toolbar seed into every
eligible empty plot and explains missing selection, empty capacity, or
insufficient stock through shared flyouts. `Harvest All` remains actionable
when no plot is ready and reuses the shared reward flyout for `Nothing to
harvest`; its notification appears only when harvests are ready. Empty plots show no unavailable-status label: they plant when the
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
The production `RootRunInventoryChoiceRowPixi` extends `ClickableWidget`, so
the entire row shares the standard compact press/release feedback. Its
standalone editor entry is `Inventory Choice Row` under
`UI Widgets / Composite widgets / Brewing`, with unselected, selected,
pressed, and unavailable scenarios.
Successful single-plot planting, `Plant All`, automated planting, and seed
swaps run one `500ms` tile-owned sequence. One seed pack starts `60px` above
the plot center, stretches as it falls straight down, then squashes and fades
at center impact. The soil boinks from its center pivot while the committed
herb scales upward from the bottom of its artwork into normal growth motion.
The persistent Seeds
picker stays still. Failed actions do not animate, hidden-room changes do not
replay on return, and reduced motion reveals the growing state immediately.
Successful single-plot planting and harvesting use the dedicated Garden action
sound banks instead of the generic click. Plot registrations suppress the
router click; purchases, dialogs, and timer acceleration retain their existing
action-specific feedback, while rejected plot taps stay silent.
Open `/src/dev/uiRecipes/garden-seed-picker.html` for the deterministic,
non-persistent four-row visual-reference state.
Open `/src/dev/uiRecipes/garden-plots.html` for the deterministic,
non-persistent empty-plot state used to verify label removal and the `no seed`
press flyout. Add `?planting=1` to make empty plots accept the selected seed
and replay the production center-drop, soil-boink, and herb-reveal sequence.
Add `?overflow=1` for
the valid 12-plot state used to verify vertical drag, wheel scrolling, the
overflow-only scrollbar, and hard resting bounds. Add
`?growing=1&progress=gradient` for the four-growing-plot regression
state that verifies Garden timer rails keep their green role color even when
the player-wide progress style is gradient. Add
`?automated=1&harvesting=1` for the yellow harvesting rail. Add
`?automated=1&quantity=2` to
render any committed count from one through five and verify that the herb group
stays evenly spaced and centered. Add `?automated=1&tapAcceleration=1` to
exercise the production per-herb
timer-reduction feedback with live recipe time. Add `?automated=1&harvest=1`
to make the long bed ready and emit the production harvest flyout from each
matching herb slot when pressed. The default recipe shows both researched bulk
actions with a selected Nettle seed; use `?bulk=plant` for the
level-5 two-action composition and `?bulk=locked` for the pre-research
Seeds-only composition. Successful planting uses one centered seed-pack drop
at each affected plot, independent of the number of seeds consumed. The
selected seed content inside the picker stays still;
the selected seed itself is restored from the gameplay save after reopening.

The cancel-progress confirmation uses the approved red danger title plaque,
Title Case copy, a centered prompt, a yellow `Keep` action, and a red `Empty`
action. The neutral seed-swap confirmation keeps the default title treatment.
