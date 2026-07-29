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

The production composition has two sections. The unframed preview keeps the
image-backed fantasy chevrons, horizontal swipe, centered cauldron, and six
compact ingredient requirement tiles in a subtle connected orbit. All six
cells are real gameplay ingredient slots; recipes may continue using fewer.
Ingredient tiles reuse the ordinary room-panel skin and show item art, name,
and owned/required count. Cauldron liquid reuses the exact source-art mask,
matches the cauldron sprite transform, and stays behind the rendered rim.
Potion identity, rarity, and batch size sit directly below the landmark.

The framed action section begins with the predicted potion inside the shared
Research-row art well. With no selected ingredients or recipe, the well stays
present as an empty solid squircle. Phase/timer progress sits beside it.
The shortened panel is bottom-anchored directly above World Chat and ends with
one wide primary button. Compact Recipes, Auto, and `xN` controls sit outside
the panel in the carousel header, right-aligned beside the cauldron title
plaque.

Boundary chevrons are removed instead of showing a disabled arrow. Carousel
dots contain every unlocked cauldron plus exactly one next purchasable locked
slot, stopping at five. A level- or research-gated future slot is omitted until
it can be purchased. The `N/5` counter stays hidden while only one cauldron is
owned.
The selected cauldron title and shared three-slot star rank sit together inside
the blue Brewing variant of the shared Research station title plaque. The
plaque connects to the screen's left edge above the carousel orbit.
Selecting the next purchasable locked slot keeps the cauldron art visible with
the Idle Outpost luminance-weighted monochrome filter and overlays the shared
lock icon. It hides recipes, auto brew, and brew plus the old unlock
sentence, then shows only the approved compact stacked cost button: `Unlock`
above the coin icon and amount. The normal framed batch-detail section and all
of its recipe/status content stay hidden for locked slots; the purchase button
is centered in that freed content region with no backing panel. Level- or
research-gated slots show no purchase button. Carousel chevrons remain
available so the player can return to another cauldron.

Recipe and automation settings dialogs remain retained, but the carousel has no
separate settings or fast-forward button. The compact Auto control uses a
gear-only button with the visible label `Auto` over the gear's lower edge and a
larger invisible hit region, remaining disabled until that cauldron's automation
research is complete. Auto Off uses the static yellow skin. Auto On uses the
green skin and advances the gear in short mechanical steps while the page is
active; reduced motion keeps the green gear static. Recipes and the narrower
`xN` control stay yellow and retain larger invisible tap regions. Before x2
batch research, the quantity control reads `x1`; quantity is never folded into
the primary Brew label. The shortened
action panel aligns to the same `16px` room edges as World Chat, and the potion
art uses the larger preview fit inside its existing well.

The action section keeps existing retained button semantics. The single primary
button follows the brewing state: manual idle is `Brew`, brewing and bottling
are yellow `Cancel`, brewed is `Bottle`, and bottled is `Collect`. Auto mode
shows `Collect` only while output is ready; otherwise it shows yellow `Cancel`.
Idle Auto `Cancel` disables Auto, while active `Cancel` destroys the unfinished
batch through the existing cancellation flow. Enabling Auto first copies the
retained page's selected recipe into the authoritative Auto recipe, then enables
the mode. Cancel has no icon.

Brewing-owned motion also remains retained: herb pickup/count/return nudges
reuse the row transform, ingredient drag, return, and brew flyouts use one
bounded ghost pool, and cauldron receive/recipe-receive/buy feedback reuses the
cauldron display tree. Deactivation and pool reset clear every target, timer,
transform, and active ghost so hidden Brewing UI performs no motion work.
