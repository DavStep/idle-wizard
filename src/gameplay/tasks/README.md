# Tasks

Tasks turn item drops into player level progress.

Each level gets its task list from SpacetimeDB `game_config.tasks`. A task consumes owned items until its required quantity is full, then it can be completed. Completing every task in the current level makes the level ready, but the player level advances only after paying the level completion gold cost.

The current balance curve defines tasks through level 44. Early levels introduce new seed/herb and potion tiers almost every level; later levels space new tiers by roughly two to three levels and use larger quantities of recent tiers between unlocks.
