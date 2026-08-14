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
      herbs: {
        open, title, cauldronIndex, slotIndex,
        rows: [{
          id, itemTypeId, key, label, detail, quantity,
          itemKind, icon, enabled, disabled, semanticId
        }]
      },
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
    openHerbPicker, selectHerb,
    performCauldronAction, primaryAction,
    selectBrewQuantity, toggleAutoBrew, toggleAutoCollect,
    cancelBrew, collectBrew,
    addHerb, dropHerb, addIngredient, removeIngredient, emptyCauldron,
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
compact ingredient requirement tiles in a subtle connected orbit. The preview
composition sits below the title/configuration row. The chevrons sit just
outside the two lower ingredient tiles and slightly below their centers, so
they read as balanced carousel navigation without interrupting the cauldron or
the middle orbit row. All six cells are real gameplay ingredient slots; recipes
may continue using fewer. Ingredient slots reuse the ordinary room-panel skin
and show item art and name only, with no quantity ratio because every occupied
slot represents one herb. Pressing an available slot opens `Choose Herb`, the
same retained inventory-choice dialog used by Garden `Choose Seed`, with herb
art and availability rows in one continuous paper. It has no selected-herb
summary or quantity controls. Choosing a herb replaces the target slot with
one item and closes the picker. The picker keeps a 4.5-row minimum viewport
and top-aligns shorter lists.
Cauldron liquid reuses the exact source-art mask,
matches the cauldron sprite transform, and stays behind the rendered rim.
Potion identity and rarity sit directly below the landmark after a recipe is
selected. A compact red cauldron-over-`Empty` action sits to the right of that
identity, immediately above the batch detail panel. It clears the selected
recipe and every staged herb for the selected cauldron, stays visible but
disabled when there is nothing to clear or a brew is active, and uses the
shared retained-button release semantics. Activating it opens the shared
confirmation dialog; only the `Empty` confirmation clears the contents,
while `Cancel` leaves the cauldron unchanged. The empty preview does not repeat
`Choose Recipe`, and batch quantity
appears only in the existing `xN` configuration control.

The framed action section begins with the predicted potion inside the shared
Research-row art well. With no selected ingredients or recipe, the well stays
present as an empty solid squircle. Phase/timer progress sits beside it.
That batch-detail rail uses the shared default purple fill.
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
larger invisible hit region. It stays hidden until that cauldron's automation
research is complete. Auto Off uses the static yellow skin. Auto On uses the
green skin and advances the gear in short mechanical steps while the page is
active; reduced motion keeps the green gear static. Recipes and the narrower
`xN` control stay yellow and retain larger invisible tap regions. The quantity
control stays hidden until x2 batch research is complete; quantity is never
folded into the primary Brew label. All visible configuration buttons share one
fixed height and pack from the right edge without reserving locked-control
slots. The shortened
action panel aligns to the same `16px` room edges as World Chat, and the potion
art uses the larger preview fit inside its existing well.

The action section keeps existing retained button semantics. The single primary
button follows the brewing state: a truly empty cauldron is yellow
`Choose Recipe` and opens the same retained recipe dialog as the compact
top-right `Recipes` control; manual idle after a recipe or ingredient is staged
is `Brew`, brewing and bottling are yellow `Cancel`, brewed is `Bottle`, and
bottled is `Collect`. Auto mode
shows `Collect` only while output is ready; otherwise it shows yellow `Cancel`.
Idle Auto `Cancel` disables Auto, while active `Cancel` destroys the unfinished
batch through the existing cancellation flow. Enabling Auto first copies the
retained page's selected recipe into the authoritative Auto recipe, then enables
the mode. Cancel has no icon.

Brewing-owned motion also remains retained: herb pickup/count/return nudges
reuse the row transform, ingredient drag, return, and brew flyouts use one
bounded ghost pool. A successful manual Brew launches each visible ingredient
from its orbit icon with a short outward/upward kick, then follows a high curved
path into the visible center of the cauldron liquid. Flights use a readable
Root Run-style `55ms` stagger and `420ms` per-item duration. Cauldron
receive/recipe-receive/buy feedback reuses the cauldron display tree. Prepared
liquid shows one sparse ripple; an active brew adds three bounded bubbles and a
small highlight drift. A newly staged herb eases into its unchanged slot and
lights its connector once. Brew completion adds one compact liquid ring and
cauldron squash, primary action changes ease the replacement label into the
existing button skin, and Collect lifts the potion art from the visible liquid
before the shared reward layer reports it. Changing
the selected cauldron through a chevron or swipe plays the same compact
directional `240ms` settle without decorative trails or particles.
Reduced motion switches instantly. Deactivation and pool reset clear every
target, timer, transform, and active ghost so hidden Brewing UI performs
no motion work.

Open `http://127.0.0.1:55173/?devUi=chooseHerb` for the deterministic
three-row real-app picker state used by visual QA when dev cheats are enabled.
The non-persistent fallback recipe is
`/src/dev/uiRecipes/brewing-herb-picker.html`.

Open
`http://127.0.0.1:55173/src/dev/uiRecipes/brewing-ready-hud.html`
for the non-persistent selected-potion batch card used to verify the potion
well, `Ready to Brew` status, progress rail, and primary action without
changing gameplay or save data.

Add
`?state=active&theme=black&repeatTheme=true&reducedMotion=true`
to reopen the active-brew regression state. It reapplies the selected theme,
keeps reduced motion enabled, and exposes the live rail value through
`#brewing-ready-hud-recipe-state[data-progress]`.
