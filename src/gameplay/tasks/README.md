# Tasks

Tasks turn normal workshop actions into player level progress. In the Workshop UI, players see them as `level N requirements`, where N is the level they are trying to reach.

Each level gets its task list from SpacetimeDB `game_config.tasks`. Requirement rows can be `research`, `summon`, `grow`, `brew`, `sell`, or `turnIn` (legacy rows with no `type` are `turnIn`). Action rows progress from gameplay events and auto-complete when they hit their target. Turn-in rows consume the submitted items until their required quantity is full, then the filled requirement can be completed. Completing every requirement in the current level makes the level ready, but the player level advances only after paying the level completion coin cost.

The current balance curve defines tasks through level 100. Levels 1-5 are hand-authored around feature introductions: summon and turn in sage seed, sell once in Market, research and summon mint seed, grow herbs, then research/brew/turn in mana tonic. Later levels use research rows as the strategic setup and follow with production rows in the same or next level, so a newly unlocked seed or recipe immediately becomes something the player uses instead of a dead unlock. Quantities stay compact early, then climb through broader seed, herb, potion, sale, and boss-style level requirements toward level 100.
