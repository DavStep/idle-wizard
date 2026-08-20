# Retained Pixi Brewing

`createBrewingPixiPage(context)` constructs the Brewing page once. Pass the
shared `assetManager`, `inputRouter`, `semanticTargets`, resolved
`dialogRegistry`, `dialogLayer`, optional retained `counters`, `ticker`, and
theme snapshot. Register the returned view as page id `brewing`.

Nine restrained warm fireflies drift behind the cauldron HUD and every
interactive control. They reuse the shared retained ambient layer, animate only
while Brewing is active, dim in Day, and remain still under reduced motion.

The selected cauldron uses the shared full-width identity ribbon with the blue
semantic skin, `Cauldron N` copy, and the existing three rank-star slots. The
small Recipes header button is intentionally absent: an empty cauldron opens
Recipes through the primary `Choose Recipe` action, which also retains the
`brewing:recipes` tutorial target. Batch quantity and Auto sit together on the
lower left, aligned opposite the existing Empty control on the lower right.

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
      recipeReadiness: { hasEnoughIngredients, hasEnoughMana },
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
      settings: { open, cauldronIndex, autoBrewEnabled }
    }
  },
  actions: {
    selectCauldron, openRecipes, selectRecipe,
    openHerbPicker, selectHerb,
    performCauldronAction, primaryAction,
    accelerateCauldron,
    selectBrewQuantity, toggleAutoBrew,
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

During brewing or bottling, the visible cauldron art is a release-only timer
acceleration target. An accepted tap removes at most one second, emits the
shared `-1s` transient flyout from the liquid anchor, and locks that cauldron
for 800ms. Horizontal movement still belongs to the carousel swipe.

The retained Recipes dialog is a two-page Expedition composition. Each visible
`BrewingRecipeCard` reuses the shared dialog-paper nine-slice, the two wider page
frames use the regular dialog's `6px` visible shell inset with a compact `2px`
source seam, and the wider pager stays aligned to their outer edges on the brown
shell below them. Potion art is optically nudged `4px` toward the outer page
edge while the recipe name keeps the regular content inset. Ingredient rows show
the herb name and art on the left and `owned/required` on the right. Every card
reserves six ingredient row-heights without drawing empty rows, so mana and time
share one stable baseline across recipes with different ingredient counts. Those
rows use aligned `Required mana:` / `Required Time:` labels and right-aligned
values, with the canonical mana icon after its numeric value. Unlocked recipe actions read
`Select` on the shared green positive-action skin. Known locked recipes are
passive and read `Not researched` over the same Settings-row nine-slice used by
Workshop Bag rows. While a recipe is being studied, the same passive row reads
`Researching: <time left>` and counts down from the Research snapshot; the
Recipes dialog never starts research. Ingredient owned values are presenter-projected
available herb counts for the selected cauldron, after subtracting herbs staged
in other cauldrons. Open `http://127.0.0.1:55173/?devUi=brewing.recipes` for the
deterministic real-app visual-QA state.

The production composition has two sections. The unframed preview keeps the
image-backed fantasy chevrons, horizontal swipe, centered cauldron, and six
compact ingredient requirement tiles in a subtle connected orbit. The preview
composition sits below the title/configuration row. The chevrons keep their
horizontal anchors just outside the two lower ingredient tiles and share the
potion-name Y axis, so navigation sits beside the selected recipe identity.
All six cells are real gameplay ingredient slots; recipes
may continue using fewer. Ingredient slots reuse the compact vertical room-panel
tile: large centered herb art above the centered herb name. When a selected
recipe is short on stock, the old compact `owned/required` count remains in the
slot corner. The horizontal ingredient/status composition is reserved for the
bottom batch-detail section. Repeated herbs still allocate owned stock across
their ordered slots for readiness. Pressing an available slot opens `Choose Herb`, the
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
present as an empty solid squircle and the status reads `No potion selected`.
The timer rail appears beside the well only while brewing or bottling. A
selected recipe blocked by stock replaces the rail with `Missing ingredients`
and grouped herb art, names, and red `xN` shortages; mana-blocked idle uses
compact recovery copy instead of an empty rail.
That batch-detail rail uses the shared default purple fill.
The shortened panel is bottom-anchored `3px` above the World Chat title
overhang and ends with one wide primary button. The expanded preview uses the
freed height for the cauldron orbit and recipe identity; its first ingredient
row starts below the centered title ribbon so the complete cauldron
composition sits in the lower half of the preview. The orbit remains a wide,
vertically pressed ellipse; extra page height changes its vertical placement,
not its proportions.
The empty-state `Choose Recipe` primary action opens Recipes. Compact Auto and
`xN` controls sit outside the panel in the lower control row, packed from the
left opposite the right-aligned Empty action.

Boundary chevrons are removed instead of showing a disabled arrow. Carousel
dots contain every unlocked cauldron plus exactly one next purchasable locked
slot, stopping at five. A level- or research-gated future slot is omitted until
it can be purchased. The `N/5` counter stays hidden while only one cauldron is
owned.
The selected cauldron title and shared three-slot star rank sit together inside
the centered blue Brewing title ribbon above the carousel orbit.
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
active; reduced motion keeps the green gear static. The `xN` control stays
yellow and retains a larger invisible tap region. The quantity
control stays hidden until x2 batch research is complete; quantity is never
folded into the primary Brew label. All visible configuration buttons share one
fixed height and pack from the left edge without reserving locked-control
slots. The shortened
action panel aligns to the same `16px` room edges as World Chat, and the potion
art uses the larger preview fit inside its existing well.

The action section keeps existing retained button semantics. The single primary
button follows the brewing state: a truly empty cauldron is green
`Choose Recipe` and opens the same retained recipe dialog as the compact
top-right `Recipes` control; manual idle after a recipe or ingredient is staged
is `Brew`, brewing and bottling are yellow `Cancel`, brewed is `Bottle`, and
bottling completion automatically grants the batch and returns to `Brew`. Newly enabled Auto remains unarmed and keeps the normal
`Brew` action available; a successful first brew arms the repeating loop.
Armed Auto shows `Cancel` while an unfinished batch is active and `Stop Auto`
while waiting for resources.
After automatic collection, a retained selected recipe keeps `Brew` as the one-tap repeat
action: when enough herbs and mana remain, it restages the recipe and starts the
next batch. Otherwise the action is disabled and the phase reads
`Missing ingredients` or `Not enough mana` while the slot counts explain the
shortage.
Armed idle Auto `Stop Auto` disables Auto, while active `Cancel` destroys the
unfinished batch only after the shared confirmation dialog warns that the unfinished
potion, herbs, and mana will be lost. Enabling Auto first copies the
retained page's selected recipe into the authoritative Auto recipe, then enables
the mode. Cancel has no icon.

Brewing-owned motion also remains retained: herb pickup/count/return nudges
reuse the row transform, ingredient drag, return, and brew flyouts use one
bounded ghost pool. A successful manual Brew launches each visible ingredient
from its orbit icon with a short outward/upward kick, then follows a high curved
path into the visible center of the cauldron liquid. Flights use a readable
Root Run-style `55ms` stagger and `420ms` per-item duration. Once the batch is
active, each source slot keeps only a faint used-ingredient ghost of its herb
art and name; the full-strength ingredient exists only in the flight. Cauldron
receive/recipe-receive/buy feedback reuses the cauldron display tree. A staged
recipe keeps the cauldron visibly empty; the liquid appears only after brewing
starts. An active brew adds three bounded bubbles and a small highlight drift.
The ambient cycle moves and scales the cauldron and its source liquid mask
together, keeping the liquid registered below the rim. A
selected unlocked cauldron also keeps its matched dark illustrated wood hearth
visible. The hearth is unlit while idle, prepared, complete, or ready;
brewing and bottling alone crossfade into a compact bright core and a wider,
dimmer outer fire. The outer layer escapes around the cauldron's lower sides
while the low-detail fuel and fire share the feet's silhouette band and render
behind the cauldron, so the body and legs occlude them as one grounded
landmark. Reduced motion keeps one static lit frame, and locked
cauldrons hide the complete hearth. A
newly staged herb eases into its unchanged slot and lights its connector once.
Brew completion adds one compact liquid ring and a contained cauldron-and-liquid
squash, and primary action changes ease the replacement label into the
existing button skin. Automatic collection uses only the shared reward drop,
anchored to the visible center of the cauldron liquid. Changing
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
changing gameplay or save data. Add `?longName=true` to reopen the wrapped
`Minor Healing Potion` identity used for short-portrait spacing QA.
Add `?cauldrons=3&selectedCauldron=2` to show both carousel chevrons around the
middle cauldron for navigation alignment QA.
Add `?state=collect&frame=mid` to freeze the production shared potion reward
drop at mid-flight from the visible cauldron liquid. The hidden recipe output
reports `data-reward-drops="1"` and `data-active-reward-drops="1"` when exactly
one visual drop was emitted.

Add
`?state=active&theme=black&repeatTheme=true&reducedMotion=true`
to reopen the active-brew regression state. It reapplies the selected theme,
keeps reduced motion enabled, and exposes the live rail value through
`#brewing-ready-hud-recipe-state[data-progress]`.
Use `?state=active&motionMs=225` to freeze the active cauldron at the liquid
cycle's highest point for reproducible containment screenshots.
