# Garden Gameplay

The garden owns buyable planting tiles. Tile costs, row width, and harvest time come from SpacetimeDB `game_config.garden`.

Player level unlocks the first 10 plot buy caps before prestige. Permanent advanced capacity research unlocks plot caps 11-20 after enough completed prestiges and makes the researched cap buyable immediately in that run, but the actual plots are still bought with coin.

Each unlocked tile can hold one active crop and one selected seed. Planting consumes the selected seed, grows the matching herb for the herb definition growth time, then waits ready. Replacing a growing seed returns the old planted seed, consumes the new seed, and restarts growth from zero. Starting harvest runs a second timer; completion adds one herb and keeps the selected seed, but the next crop starts only when the player presses `plant`. Selecting `empty` clears the next seed without clearing an active crop. Canceling in-progress growth or harvest returns the planted seed and clears the plot selection.
