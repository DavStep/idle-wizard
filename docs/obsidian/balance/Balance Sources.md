---
title: Balance Sources
tags:
  - balance
  - source
status: active
world: balance
---

# Balance Sources

## Primary Files

- `src/gameplay/tasks/tasks.json` - level requirements and completion coin costs.
- `src/gameplay/playerLevel/managers/PlayerLevelBalanceManager.js` - mana,
  crystal, and capacity milestone defaults.
- `src/gameplay/research/README.md` - research cost families, gates, and reset
  behavior.
- `src/gameplay/shop/README.md` - trader/player market timing, prices, and
  limits.
- `src/gameplay/prestige/README.md` - milestone reset and ruby rules.

## Config Authority

SpacetimeDB `game_config.tasks`, `game_config.playerLevel`,
`game_config.garden`, `game_config.shop`, and `game_config.research` can
override runtime tuning. Generated database bindings should not be edited
manually.

## Related

- [[Level Curve]]
- [[Currencies]]
- [[Capacity Gates]]
