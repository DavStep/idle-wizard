# Experience

## Communication

- Use caveman communication by default: terse, technical, no filler.
- If a requested feature is ambiguous, ask first instead of guessing.
- The user wants only what was asked for; avoid adding gameplay, visuals, or extra systems early.

## Product Shape

- This is an Android-first mobile JavaScript game.
- The authored game viewport is `1080x2170`.
- A Dark Room is style guidance only; do not copy its desktop resolution/layout.
- A page means a room view, not a web route.
- The first page is `Workshop`.
- Room navigation order is `Brewing -> Garden -> Workshop -> Research -> Shop`; Workshop stays the default page.
- Show the current page name at the bottom center of the room view.
- The top status panel is shared room chrome; show gameplay gold there, not a separate coin currency.
- Workshop leaderboard UI reads `snapshot.leaderboard.topUsers` when supplied; do not fake income data in gameplay.
- Leaderboard `income` tab should read server-provided `income`; `total generated gold` can use existing `totalIncome`.

## Architecture

- Use full ECS for gameplay.
- Every micro feature should have its own manager.
- Big features need facades with compact non-programmer explanations.
- Keep gameplay rules separate from DOM/canvas rendering and SpacetimeDB transport.
- bitECS 0.4 component calls use entity-first order: `addComponent(world, eid, component)`.
- Player-facing event logs belong in gameplay/logs; page code should only render snapshot logs.
- Completion logs for timed systems should come from system-manager callbacks, not from page button clicks.
- Gameplay resources/inventory/research/shop state is currently in-memory only; dev HMR or reload resets it until a persistence facade exists.

## Gameplay Economy

- Mana has generation and a cap; both should be upgradeable later.
- Summoning seeds consumes mana.
- Canonical seed names: Sage, Mint, Nettle, Lavender, Briar, Glowcap, Mandrake, Sunroot, Moonflower, Frostmoss, Dreambell, Star Anise, Bloodrose, Dragonpepper.
- For now, all seed drops use equal weight; keep a weight field anyway so rarity can change later.
- Seeds produce herbs, and herbs have growth duration.
- Garden page herb inventory should read owned counts from `snapshot.garden.herbs`; Brewing's herb snapshot can subtract staged cauldron ingredients.
- Garden herb inventory groups completed `unlockSeed:*` herbs above locked herbs, with zero-count rows in disabled gray.
- Brewing is active: herbs can be staged in cauldron order, brew spends mana, valid unlocked recipes make potions, and invalid mixes make Wasted Potion.
- Potion recipe ingredient order matters; expand grouped quantities in listed order for matching.
- Brewing recipe-book UI should read `snapshot.brewing.recipes` and show only unlocked recipes; locked recipes stay hidden until research unlocks them.
- Brewing herb controls are tap-first on mobile; drag should start only after movement crosses a small threshold.
- Brewing keeps the action button generic (`brew (N mana)`); cauldron status/message carries matched potion, locked recipe, and wasted mix state.
- Brewing recipe selection is page-local UI state; the guide box can help stage herbs but must not change recipe matching rules.
- Brewing recipe guide ingredient rows use grouped recipe quantities (`- 2 Sage`), not expanded numbered slots.
- Brewing recipe popup rows use an explicit `mark` action to send a recipe to the guide; do not hide that action behind the recipe name.
- Brewing shows `recipes` and `potions` as sibling buttons, not a bordered recipes block; potions popup reads owned potion stacks from `snapshot.inventory`.
- Wasted Potion is not researchable and sells for 1 gold by item-level sell price override.
- Research prices come from `src/gameplay/research/research-balance.json`; seed unlock research gates summon drops, and recipe unlock research gates known potion brewing.
- Mana production and cap research levels come from `manaUpgradeSeries` in `research-balance.json`; UI shows only the next incomplete level in each series.
- Seed/herb unlock research and recipe unlock research are catalog-ordered; each row requires the previous row before it can be bought.
- `unlockSeed:sageSeed` costs `0` and displays as `free`; seed summoning stays locked until that research is completed.
- `summonSeedsX2` through `summonSeedsX5` use the highest completed multiplier; summon cost and rolled seed count both scale from 10 mana.
- Initial local gameplay defaults: mana cap `50`, mana generation `1/second`, seed summon cost `10`, herb growth `60s`.
- Crystal is the hard currency; it starts at `0`, appears in the top panel, and currently has no earning or spending rule.
- Shop shelf slot 1 starts unlocked for free; later slots cost gold from `shop-balance.json`.
- Shop slots auto-sell one selected item type over time; open a popup with `seed`/`herb`/`potion` tabs to choose exact items.
- Selecting a shop slot should only open the sell picker; do not show a `selected slot N` shelf message.
- Shop price UI should read `sellGold` from the shop snapshot; do not duplicate price balance in page code.
- Shop auto-sell should pass the item definition to `getSellGold(kind, item)` so item-level price overrides apply.
- Shop shelf selected slots show owned item quantity plus sell price; do not render a separate shelf gold row.
- Shop shelf selected slots should get quantity from slot snapshots, because zero-count selected items may be hidden from picker rows.
- Shop shelf future locked slots display `locked`; only the next locked slot displays its buy action.
- Shop sell picker opens only after `selectShopShelfSlot` returns `ok: true`; failed locked-slot selection leaves the old selected slot in the snapshot.
- Player shop shelf listings reserve local inventory quantity and store a per-item gold value; they do not auto-sell over time.
- Player shop server listings own market quantity, while local gameplay owns inventory and gold changes after reducer success.
- Garden plot should use compact text rows, not rhombus tiles; show open plots plus only the next buy row, with no future locked summary.
- Garden plot rows use one right-aligned status/action slot; do not split phase and action into separate columns.
- Keep Garden seed choice in a popup opened from an empty plot row/seed label; do not put seed lists inline in the plot.
- Garden tiles keep selected seed separate from active crop; harvest completion preserves selection and auto-replants only when that seed is owned.
- Garden seed selection is locked while a tile has an active crop; active crop saves should restore selected seed from the planted crop.
- Garden growth/harvest timer text belongs next to the right action label, not inside the progress rail.
- Garden plot right-side action labels (`choose`, `no seeds`, `buy`, `growing`, `harvest`) should share the smaller growing-label size.
- Keep herbs below the plot with enough space for active progress rows; bounded plot scrolling is acceptable once many plots are unlocked.

## Style

- The project style is based on `https://adarkroom.doublespeakgames.com/`.
- Use black text, white surfaces, readable serif text with some character, thin black borders, compact panels, and minimal decoration.
- Project typography uses `Source Serif 4` at `15px` source size with tabular lining numerals for values.
- Keep popup/dialog titles at `16px`; ordinary block titles and body text share the source size.
- Box titles use bold weight.
- Mobile readability comes from the room UI scale layer, not from changing the source font size upward.
- Source UI scale must follow the fitted viewport scale, not stay fixed at `3`, so web and mobile views both fit.
- Mobile keyboard resize must not recompute scale from the shrunken visual height while text input is focused or while the keyboard is closing after focus leaves.
- Text-entry focus should use `preventScroll` so mobile browsers do not pan the game surface.
- Text-entry dialogs should sit high enough that the mobile keyboard does not cover save/cancel actions.
- Text-entry dialog save buttons should save on `pointerdown` so keyboard blur cannot move the scaled layout before click submit.
- Non-dialog boxes stay simple: `1px` border, compact padding, no shadow.
- Popup/dialog panels can use the thicker event-panel treatment: `2px` border and `5px 5px 5px #666` shadow in source UI units.
- The Workshop mana-only resource block is called `mana sphere`.
- Workshop seed count and summon seed action live in a separate `seeds` block.
- Clicking `seeds` in the seeds block opens the seed inventory as a popup, not an inline room block.
- Do not add decorative visuals unless the user explicitly asks.
- Managers subscribed to gameplay snapshots can render every frame; keep buttons stable and update text/state instead of replacing interactive DOM nodes.
- In per-frame snapshot renderers, guard `textContent`/attribute writes; setting the same `textContent` still replaces text nodes and can flicker in the scaled mobile WebView.
- Treat in-game UI as controls, not selectable document text: set non-selection/tap-highlight suppression on `.game-stage` descendants and opt text inputs back into normal selection.
- Research catalog content can exceed the visible room; keep bottom nav clear and let the research content scroll instead of squeezing page chrome.
- Research blocks should render no more than 3 locked rows each; keep deeper locked research hidden until earlier items unlock.
- Completed research rows display `researched` and keep the same fixed value-slot height as price controls.
- Research price controls are unboxed right-aligned text buttons; preserve click behavior without visible price boxes.
- Research name clicks open a `style-dialog` info popup; keep explanation text on the research definition snapshot.
- Brewing recipe popup hides locked recipes; recipe names are bold, while ordered ingredient rows and `time:` details stay muted.
- Brewing active brew timer text belongs next to the active brew label, not inside the progress rail.
- Brewing completion flows brew timer -> manual start bottling action -> bottling timer -> collect-ready state; potion inventory is granted only by the collect action.
- Brewing cauldron count lives as a normal-weight border-corner label like `0/5`; empty cauldron status stays blank and `empty` is centered in the box.
- Brewing cauldron staged ingredients display as adjacent quantity groups like `- 2 Nettle`; do not show numbered slots.
- Seed summon feedback is a transient flyout, not a persistent row in the `seeds` block.
- Seed summon logs list exact seed labels/counts, never a generic `summoned N seeds`.
- Tabbed popups put tab buttons below and outside the bordered `.style-dialog`; keep modal role/focus on the wrapper.
- Keep an `8px` source gap between tabbed popup dialogs and their bottom tab buttons.
- Popup tab buttons use the same `2px` stroke as popup dialogs.
- Dialog close controls should sit as normal-weight border labels, like titles but not bold, not as boxed buttons inside the panel.
- Room UI layer uses `box-sizing: content-box`; wrappers that center fixed-width `.style-dialog` content must account for dialog padding and borders.
- Padded inputs inside flex columns need `box-sizing: border-box` or explicit width math; content-box `width: 100%` overflows columns.
- Shop sell picker shows `empty` as the first normal item option, not as a custom separate control.
- Top panel layout uses two rows: username full-width above mana/gold/crystal, so resource text does not squeeze names.
- Shared top and bottom room chrome should use the same `16px` source side inset as Research content.
- Main room page content panels should also use the Research-width `16px` source side inset.
- Mobile page swipes listen in capture phase; horizontal drags on room controls navigate, while taps still activate controls. Inputs, dialogs, and draggable targets stay blocked.
- Swipe ghost-click suppression must clear on a new touch/pointer start, or the first real tap after swiping into a room can be swallowed.
- Popup rows must not be `replaceChildren`-reordered every frame; mobile taps can lose their click when the touched button is reinserted.
- Cauldron ingredient remove buttons also need stable DOM nodes across snapshot renders; mobile click fires after touchend and can miss replaced targets.
- Page boxes that also use `.style-box` must reassert `position: absolute` after the shared `.style-box` rule, or they become relative and can overflow.
- Logs popup shows newest entries first, starts at top, and uses scroll progress plus bottom fade instead of showing a native scrollbar.
- Logs popup should auto-pin new entries only while the player is at top; preserve manual scroll position otherwise.
- Timed progress bars should visually match the logs dialog rail: 3px high, compact black border, black fill, no visible timer label inside the rail.

## Backend And Android

- Backend target is SpacetimeDB.
- World chat is server-backed through the `world_chat` table and `send_world_chat_message` reducer; Workshop UI must stay offline-safe when bindings/backend are absent.
- When asked to run the project, also check whether SpacetimeDB backend is running; start it if port `3000` has no backend listener.
- Generated SpacetimeDB bindings belong in `src/backend/spacetimedb/module_bindings/`.
- App must still build when generated SpacetimeDB bindings are missing; load them dynamically and fail soft.
- Server tables currently own shared `player` identity rows and `leaderboard` rows; client syncs username only.
- Leaderboard total generated gold uses local gold lifetime total synced through `set_total_generated_gold`; current gold alone is not enough because spending lowers it.
- Hydrate username from the server `player` row before pushing local values; otherwise local `wizard` can overwrite saved DB profile data.
- Queue explicit username edits made before server profile hydration finishes, then sync them after hydration so old server rows do not erase the user's save.
- SpacetimeDB table callbacks pass inserted/updated rows; use those callback rows for player profile sync because immediate table scans can still read stale usernames.
- Local SpacetimeDB CLI target should be `local` (`http://127.0.0.1:3000`); anonymous publish cannot update an existing dev DB.
- Dynamic market prices should be server-authoritative and shared through SpacetimeDB subscriptions.
- Player shop sale proceeds live in `player_shop_proceeds` until the seller claims them into local gold.
- Android packaging uses Capacitor.
- Capacitor 8 Android builds require JDK 21 here.
- Capacitor Android serves bundled assets as `https://localhost` by default; local `ws://` SpacetimeDB is blocked as mixed content unless `server.androidScheme` is `http` and cleartext is allowed, then the app is rebuilt/synced.
- Localhost ports `5173` and `5174` were already shadowed; `55173` worked for this project.
