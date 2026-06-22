# Tasks

Tasks turn item drops into player level progress. In the Workshop UI, players see them as `level N requirements`, where N is the level they are trying to reach.

Each level gets its task list from SpacetimeDB `game_config.tasks`. Turning in a requirement consumes the submitted items until its required quantity is full, then the filled requirement can be completed. Completing every requirement in the current level makes the level ready, but the player level advances only after paying the level completion coin cost.

The current balance curve defines tasks through level 100. Config level 4 is the target level 5 requirement row, because task `currentLevel` is the paid player level. Target levels 5-10 use one seed, two herbs, and one potion with low rounded quantities. Target levels 11-100 use one seed, two herbs, and two potions across lower-medium, medium, medium-hard, and hard quantity tiers. From config level 9 onward, adjacent levels should not reuse exact requirement items; direct herb quantities stay lighter while potion quantities carry more of the grind.
