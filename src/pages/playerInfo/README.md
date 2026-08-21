# Player Info Dialog

Shows a compact dialog when a visible player profile is pressed, including the current player's top-panel avatar. It reads public social/profile data from the backend player info facade and composes the shared framed Player Avatar widget, star-backed Prestige status, and a separate lifetime-stat section for produced coin, brewed potions, harvested herbs, last-seen state, and server-counted hours played. The identity section keeps the username on its own first line; alliance members receive a second line with the colored tag and alliance name at left and their role at right. Lifetime totals use the same compact big-number notation as leaderboard totals.

The current player's dialog adds yellow `Cosmetics` and `Friends` actions beneath the two paper sections, inset `2px` from their visible edges with a compact `10px` shell footer below them. Other players receive the relationship actions allowed by the Friends snapshot, plus a second Promote/Demote/Kick row when the current alliance role permits it. While public player info is loading, the dialog reserves every action slot that may appear after hydration and renders each as a disabled gray `Loading` button so the shell does not jump when the data arrives.

Open the deterministic production dialog with `/?devUi=playerInfo` or `cheats.openUi('playerInfo')`.
When the shared app server was started without cheats, use `/src/dev/uiRecipes/player-info-dialog.html`; it mounts the same retained production dialog and assets without backend state.
