# Player Level

Player level reads the task level and turns it into configured account-wide milestones.

The current scope gates how many garden tiles and cauldrons can be bought. SpacetimeDB `game_config.playerLevel` decides which buys the current level permits. Reaching a milestone does not grant a tile or cauldron for free. Market stalls and traded item grades instead come from the active market rank unlocked through prestige.

Player level no longer grants mana cap or mana regeneration directly. Instead, each level from 2 through 100 makes the matching capacity and generation ranks eligible for sequential coin research in the Mana Sphere box.

Player levels also grant crystal through `crystal.perLevel` in `game_config.playerLevel`. Level 1 grants this reward too, so the natural crystal total through a level equals that level times the configured per-level reward.

The current playable cap is level 44. SpacetimeDB caps reported player levels and accepted player-level config at the same value, so raising this curve requires updating the backend constants before publishing.

Milestones can also include display-only `unlocks` and `researchUnlocks` arrays. Those render as `unlocks chat` or `allows researching "Mana Cap"` in the level dialog; they do not gate gameplay until a feature wires that rule.

`maxCauldrons` is a buy cap. Brewing owns the purchased cauldron count and costs.
