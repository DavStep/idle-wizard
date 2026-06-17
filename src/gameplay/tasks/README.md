# Tasks

Tasks turn item drops into player level progress. In the Workshop UI, players see them as `level N requirements`, where N is the level they are trying to reach.

Each level gets its task list from SpacetimeDB `game_config.tasks`. Turning in a requirement consumes the submitted items until its required quantity is full, then the filled requirement can be completed. Completing every requirement in the current level makes the level ready, but the player level advances only after paying the level completion gold cost.

The current balance curve defines tasks through level 44. Early levels introduce new seed/herb and potion tiers almost every level; later levels space new tiers by roughly two to three levels and use larger quantities of recent tiers between unlocks.
