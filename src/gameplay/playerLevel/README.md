# Player Level

Player level reads the task level and turns it into configured account-wide milestones.

The current scope gates how many garden tiles, cauldrons, trader market stands, and player market stands can be bought. SpacetimeDB `game_config.playerLevel` decides which buys the current level permits. Reaching a milestone does not grant the tile, cauldron, or stand for free.

Player level also sets mana cap and mana regen through the `mana` progression in `game_config.playerLevel`. Each level gives +50 cap. Mana regen starts at 1/sec on level 1, then level-ups to 2-5 add +1/sec each, 6-10 add +0.5/sec each, and 11+ add +0.25/sec each.

Player levels also grant crystal through `crystal.perLevel` in `game_config.playerLevel`. Level 1 grants this reward too, so the natural crystal total through a level equals that level times the configured per-level reward.

The current playable cap is level 44. SpacetimeDB caps reported player levels and accepted player-level config at the same value, so raising this curve requires updating the backend constants before publishing.

Milestones can also include display-only `unlocks` and `researchUnlocks` arrays. Those render as `unlocks chat` or `allows researching "Mana Cap"` in the level dialog; they do not gate gameplay until a feature wires that rule.

`maxCauldrons` is a buy cap. Brewing owns the purchased cauldron count and costs.
