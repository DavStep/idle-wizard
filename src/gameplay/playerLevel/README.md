# Player Level

Player level reads the task level and turns it into configured account-wide milestones.

The current scope gates how many garden tiles, cauldrons, NPC market stands, and player market stands can be bought. SpacetimeDB `game_config.playerLevel` decides which buys the current level permits. Reaching a milestone does not grant the tile, cauldron, or stand for free.

Player level also sets mana cap and mana regen through the `mana` progression in `game_config.playerLevel`. Each level gives the old mana research amounts: +50 cap and +1 mana per second.

Player level-ups also grant crystal through `crystal.perLevel` in `game_config.playerLevel`. Level 1 is the starting level and does not grant this reward.

The current playable cap is level 44. SpacetimeDB caps reported player levels and accepted player-level config at the same value, so raising this curve requires updating the backend constants before publishing.

Milestones can also include display-only `unlocks` and `researchUnlocks` arrays. Those render as `unlocks chat` or `allows researching "Mana Cap"` in the level dialog; they do not gate gameplay until a feature wires that rule.

`maxCauldrons` is a buy cap. Brewing owns the purchased cauldron count and costs.
