# Player Info Dialog

Shows a compact read-only dialog when a visible player profile is pressed, including the current player's top-panel avatar. The dialog stays presentation-only and reads public social/profile data from the backend player info facade. It composes the shared framed Player Avatar widget, star-backed Prestige status, and a separate lifetime-stat section for produced coin, brewed potions, harvested herbs, last-seen state, and server-counted hours played.

Open the deterministic production dialog with `/?devUi=playerInfo` or `cheats.openUi('playerInfo')`.
When the shared app server was started without cheats, use `/src/dev/uiRecipes/player-info-dialog.html`; it mounts the same retained production dialog and assets without backend state.
