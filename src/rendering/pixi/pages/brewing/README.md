# Retained Pixi Brewing

`createBrewingPixiPage(context)` constructs the Brewing page once. Pass the
shared `assetManager`, `inputRouter`, `semanticTargets`, resolved
`dialogRegistry`, `dialogLayer`, optional retained `counters`, `ticker`, and
theme snapshot. Register the returned view as page id `brewing`.

The preferred renderer-neutral view model is:

```js
{
  brewing: {
    now,
    selectedCauldronIndex,
    cauldrons: [{
      id, cauldronIndex, cauldronNumber, title, level,
      unlocked, disabled, canBuyCauldron, lockedLabel,
      countText, statusText, bubbleText, message,
      ingredients: [{ id, slotIndex, quantity, label, valueText, removable }],
      selectedRecipe: {
        key, label, ingredients: [{ itemKey, quantity, owned }]
      },
      autoCollectEnabled,
      guideRows: [{ id, quantity, label, valueText, fulfilled }],
      activeBrew: {
        key, label, text, durationMs, remainingMs, endTimeMs, progress
      },
      preview: { key, iconKey, iconFrame, label, empty, locked },
      recipeAction: { label, enabled, visible, onActivate },
      primaryAction: {
        id, label, enabled, visible, locked, costText, costResource, onActivate
      },
      quantityAction: {
        label, enabled, visible, nextQuantity, onActivate
      },
      autoAction: { label, enabled, visible, selected, onActivate },
      acceptsHerbDrop, selected, semanticId, tutorialId,
      onActivate, onHerbDrop
    }],
    inventory: {
      activeTab: null | 'herbs' | 'potions',
      herbs: { visible, expanded, canToggle, countText, rows },
      potions: { visible, expanded, canToggle, countText, rows }
    },
    dialogs: {
      recipes: {
        open, title, cauldronIndex, spreadIndex,
        recipes: [{
          id, key, label, infoText, unlocked, unknown, selected,
          iconKey, costText, durationText, ingredients
        }]
      },
      choice: { open, title, cauldronIndex, onClearRecipe, onChooseAnother },
      settings: { open, cauldronIndex, autoBrewEnabled, autoCollectEnabled }
    }
  },
  actions: {
    selectCauldron, openRecipes, selectRecipe,
    performCauldronAction, primaryAction,
    selectBrewQuantity, toggleAutoBrew, toggleAutoCollect,
    cancelBrew, collectBrew,
    addHerb, dropHerb, addIngredient, removeIngredient,
    toggleInventory, toggleInventoryExpanded, inspectPotion,
    previewHerbDrag, endHerbDrag, cancelHerbDrag,
    closeDialog
  }
}
```

All labels, affordability/lock states, valid drop targets, recipe matching,
quantities, timer endpoints, and result messages must come from the presenter.
The small raw-snapshot fallbacks exist only to ease atomic cutover and do not
perform writes or own game rules.

The production composition is a single selected-cauldron carousel with
image-backed fantasy chevrons and horizontal swipe. The chevrons keep the
existing gray button, press, disabled, and semantic-target contracts while
replacing the visible text glyphs. Its dots contain every unlocked cauldron plus
exactly one next locked slot, stopping at five. The batch panel always renders six visual
ingredient cells in a 3x2 grid; gameplay still accepts at most five ingredients,
so the sixth cell is a deliberate decorative empty state.
The selected cauldron title sits inside the carousel frame at the top-left,
followed by the shared three-slot star-rank treatment for that cauldron's level.
Selecting the next purchasable locked slot keeps the cauldron art visible with
the Idle Outpost luminance-weighted monochrome filter and overlays the shared
lock icon. It hides recipes, autobrew, brew, and settings plus the old unlock
sentence, then shows only the approved compact stacked cost button: `Unlock`
above the coin icon and amount. Level- or research-gated slots show no purchase
button. Carousel chevrons remain available so the player can return to another
cauldron.

Recipe and automation settings dialogs are constructed on first open and
retained. The fast-forward affordance is nonfunctional for now and emits the
page-local `coming soon` transient toast. The implementation has no DOM surface,
DOM event listener, selector, or computed-style dependency.

The carousel action row keeps its existing retained button semantics while
adding leading illustrated cues: the approved brown-and-purple spellbook for
recipes, potion for autobrew, three potions for brew quantity, the reference
gray-steel cog for settings, and the shared X artwork for cancel.

Brewing-owned motion also remains retained: herb pickup/count/return nudges
reuse the row transform, ingredient drag, return, and brew flyouts use one
bounded ghost pool, and cauldron receive/recipe-receive/buy feedback reuses the
cauldron display tree. Deactivation and pool reset clear every target, timer,
transform, and active ghost so hidden Brewing UI performs no motion work.
