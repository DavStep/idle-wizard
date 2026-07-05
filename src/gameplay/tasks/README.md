# Tasks

Tasks turn normal workshop actions into player level progress. In the Workshop UI, players see them as `level N requirements`, where N is the level they are trying to reach.

Each level gets its task list from SpacetimeDB `game_config.tasks`. Requirement rows can be `research`, `summon`, `grow`, `brew`, `sell`, or `turnIn` (legacy rows with no `type` are `turnIn`). Action rows progress from gameplay events and auto-complete when they hit their target. Turn-in rows consume submitted items until their required quantity is full, then auto-complete. Completing every requirement in the current level makes the level ready, but the player level advances only after paying the level completion coin cost.

The current balance curve defines tasks through level 100. Levels 1-4 are hand-authored to stay fast around the first summon, Market, Research, and Garden beats. Levels 5-10 bridge into real play: 5-8 are regular work, 9 is a hard checkpoint, and 10 is the first wall. Later decades repeat that sawtooth: the first few levels after each wall are relief, the middle builds pressure, level 9 of the decade is hard, and level 10 of the decade is the wall. Research rows still set up production in the same or next level, so a newly unlocked seed or recipe immediately becomes something the player uses instead of a dead unlock.
