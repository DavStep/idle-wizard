# Tasks

Main quests turn normal Workshop actions into player level progress. The Workshop shows one `elara's request` at a time. Every completed request fills one segment in the shared top-panel level rail.

Each level gets its ordered request chain from SpacetimeDB `game_config.tasks`. Requests can be `research`, `summon`, `grow`, `brew`, `sell`, or `turnIn` (legacy rows with no `type` are `turnIn`). Only the current request collects progress. Action requests auto-complete when they hit their target. Turn-in requests consume submitted items until their required quantity is full, then auto-complete. After the configured requests, paying the existing level completion coin cost is the final segment; completing it advances the level.

The current balance curve defines tasks through level 100. Levels 1-4 are hand-authored to stay fast around the first summon, Market, Research, and Garden beats. Levels 5-10 bridge into real play: 5-8 are regular work, 9 is a hard checkpoint, and 10 is the first wall. Later decades repeat that sawtooth: the first few levels after each wall are relief, the middle builds pressure, level 9 of the decade is hard, and level 10 of the decade is the wall. Research rows still set up production in the same or next level, so a newly unlocked seed or recipe immediately becomes something the player uses instead of a dead unlock.
