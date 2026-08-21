# Garden Gameplay

The garden owns buyable planting tiles. Tile costs, row width, and harvest time come from SpacetimeDB `game_config.garden`.

Player level unlocks the first 5 plot buy caps before prestige. Permanent advanced capacity research unlocks plot caps 6-12 after enough completed prestiges and makes the researched cap buyable immediately in that run, but the actual plots are still bought with coin.

Each unlocked tile can hold one active crop. The manual Garden UI keeps one page-level selected seed in the gameplay save, restores it when the game reopens, then passes it to any empty plot the player taps. Legacy saves without that field start with no toolbar selection. Planting consumes that seed quantity, grows the matching herb for the herb definition growth time, then waits ready. Replacing a growing seed returns the old planted seed, consumes the newly selected seed, and restarts growth from zero. Starting harvest runs a second timer; completion adds the plot's herb. `garden:plantAll` unlocks at player level 5 for 1,000 coin and plants the selected seed in unlocked empty plots in tile order until stock runs out. `garden:harvestAll` requires that study, unlocks at level 10 for 10,000 coin, and starts the harvest timer on every ready plot. `GardenBulkActionManager` enforces both gates independently of rendering. Canceling in-progress growth or harvest returns the planted seed and clears the plot selection.

Automated plots keep a separate future seed, persisted Auto on/off state, and a
persisted planting quantity. The quantity ranges from 1 through that plot's
current planting multiplier (maximum 5), can change for the next cycle while a
crop is active, and is committed to `harvestQuantity` when growth starts.
Missing legacy settings keep
the prior behavior: Auto is on and planting uses the current maximum.

Each herb definition owns its configured growth duration. Regular per-herb mastery reduces that duration independently in five-percentage-point ranks, then advanced per-plot research applies to the result. Sage remains at the previous `12s`; early herb uplifts ramp by tier before Glowcap and later herbs use the full `85%` uplift.

`GardenTapAccelerationManager` owns manual active-plot acceleration. Each accepted
tap removes 30% of that plot's remaining growth or harvest timer, then
rejects further taps on the same plot for 504ms. The cooldown is enforced in
gameplay as well as rendering so direct or repeated action calls cannot bypass
it. Cooldowns are transient and reset when a persistence snapshot is loaded.
