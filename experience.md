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
- Research is the room page immediately right of Workshop; Shop sits to the right of Research.
- Show the current page name at the bottom center of the room view.
- The top status panel is shared room chrome; show gameplay gold there, not a separate coin currency.
- Workshop leaderboard UI reads `snapshot.leaderboard.topUsers` when supplied; do not fake income data in gameplay.

## Architecture

- Use full ECS for gameplay.
- Every micro feature should have its own manager.
- Big features need facades with compact non-programmer explanations.
- Keep gameplay rules separate from DOM/canvas rendering and SpacetimeDB transport.
- bitECS 0.4 component calls use entity-first order: `addComponent(world, eid, component)`.

## Gameplay Economy

- Mana has generation and a cap; both should be upgradeable later.
- Summoning seeds consumes mana.
- Canonical seed names: Sage, Mint, Nettle, Lavender, Briar, Glowcap, Mandrake, Sunroot, Moonflower, Frostmoss, Dreambell, Star Anise, Bloodrose, Dragonpepper.
- For now, all seed drops use equal weight; keep a weight field anyway so rarity can change later.
- Seeds produce herbs, and herbs have growth duration.
- Potions exist only as dormant item concepts for now; no brewing, effects, or UI yet.
- Potion recipes are dormant data for now; mana cost and brew duration are metadata, not active brewing behavior.
- Research is currently a catalog/page only; do not add completion costs, mana effects, seed drop filtering, summon multipliers, or recipe gating until rules are specified.
- Initial local gameplay defaults: mana cap `50`, mana generation `1/second`, seed summon cost `10`, herb growth `60s`.
- Shop shelf slot 1 starts unlocked for free; later slots cost gold from `shop-balance.json`.
- Shop slots auto-sell one selected item type over time; open a popup with `seed`/`herb`/`potion` tabs to choose exact items.
- Shop price UI should read `sellGold` from the shop snapshot; do not duplicate price balance in page code.

## Style

- The project style is based on `https://adarkroom.doublespeakgames.com/`.
- Use black text, white surfaces, readable serif text with some character, thin black borders, compact panels, and minimal decoration.
- Keep source UI typography at `16px`; mobile readability comes from the room UI scale layer.
- Source UI scale must follow the fitted viewport scale, not stay fixed at `3`, so web and mobile views both fit.
- Non-dialog boxes stay simple: `1px` border, compact padding, no shadow.
- Popup/dialog panels can use the thicker event-panel treatment: `2px` border and `5px 5px 5px #666` shadow in source UI units.
- The Workshop resource/action block is called `mana sphere`.
- The summon seed button sits outside the mana sphere box.
- Clicking `seeds` in the mana sphere opens the seed inventory as a popup, not an inline room block.
- Do not add decorative visuals unless the user explicitly asks.
- Managers subscribed to gameplay snapshots can render every frame; keep buttons stable and update text/state instead of replacing interactive DOM nodes.

## Backend And Android

- Backend target is SpacetimeDB.
- Generated SpacetimeDB bindings belong in `src/backend/spacetimedb/module_bindings/`.
- App must still build when generated SpacetimeDB bindings are missing; load them dynamically and fail soft.
- Server tables currently own shared `player` identity rows and `leaderboard` rows; client syncs username only.
- Local SpacetimeDB CLI target should be `local` (`http://127.0.0.1:3000`); anonymous publish cannot update an existing dev DB.
- Dynamic market prices should be server-authoritative and shared through SpacetimeDB subscriptions.
- Android packaging uses Capacitor.
- Capacitor 8 Android builds require JDK 21 here.
- Localhost ports `5173` and `5174` were already shadowed; `55173` worked for this project.
