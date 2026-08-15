# Player Info Dialog

Shows a compact dialog when a visible player profile is pressed, including the current player's top-panel avatar. It reads public social/profile data from the backend player info facade and composes the shared framed Player Avatar widget, star-backed Prestige status, and a separate lifetime-stat section for produced coin, brewed potions, harvested herbs, last-seen state, and server-counted hours played.

The current player's dialog adds one yellow `Cosmetics` action beneath the two paper sections, inset `2px` from their visible edges with a compact `10px` shell footer below it. It closes Player Info and opens the existing Wizard avatar/frame surface. Other players' dialogs remain read-only.

Open the deterministic production dialog with `/?devUi=playerInfo` or `cheats.openUi('playerInfo')`.
When the shared app server was started without cheats, use `/src/dev/uiRecipes/player-info-dialog.html`; it mounts the same retained production dialog and assets without backend state.
