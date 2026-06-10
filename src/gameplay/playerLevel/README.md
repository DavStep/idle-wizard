# Player Level

Player level reads the task level and turns it into configured account-wide milestones.

The current scope gates how many garden tiles, NPC market stands, and player market stands can be bought. The physical garden and market still use their own balance files for total counts and costs; `player-level-balance.json` decides which of those buys the current level permits. Reaching a milestone does not grant the tile or stand for free.

Player level also sets mana cap and mana regen through the `mana` progression in `player-level-balance.json`. Each level gives the old mana research amounts: +50 cap and +1 mana per second.

Milestones can also include display-only `unlocks` and `researchUnlocks` arrays. Those render as `unlocks chat` or `allows researching "Mana Cap"` in the level dialog; they do not gate gameplay until a feature wires that rule.

`maxCauldrons` is exposed in the level dialog as a milestone cap, but cauldron buying is not wired yet.
