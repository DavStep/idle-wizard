# Tasks

Main quests turn normal Workshop actions into player level progress. The Workshop shows one `Elara's Request` at a time. Every completed request fills one segment in the shared top-panel level rail, and the active request's partial progress fills its current segment proportionally.

Each level gets its ordered request chain from SpacetimeDB `game_config.tasks`. Requests can be `research`, `summon`, `grow`, `brew`, `sell`, or `turnIn` (legacy rows with no `type` are `turnIn`). Only the current request collects progress. Action requests auto-complete when they hit their target. Turn-in requests consume submitted items until their required quantity is full, then auto-complete. Every configured request owns one level-rail segment. Completing the final request automatically advances the player level without requiring or spending coin.

`coinBudget` is a balancing input for daily tasks and weekly world events. It is not a level-up price. Legacy runtime `completionCostCoin` and `completionCostGold` values normalize into that budget and never enter level-completion state.

The current balance curve defines tasks through level 100. Levels 1-4 are hand-authored to stay fast around the first summon, Market, Research, and Garden beats. Levels 5-10 bridge into real play: 5-8 are regular work, 9 is a hard checkpoint, and 10 is the first wall. Later decades repeat that sawtooth: the first few levels after each wall are relief, the middle builds pressure, level 9 of the decade is hard, and level 10 of the decade is the wall. Research rows still set up production in the same or next level, so a newly unlocked seed or recipe immediately becomes something the player uses instead of a dead unlock.

The guided tutorial still ends after level 5. Elara's post-tutorial requests teach item timer mastery without adding another overlay: level 6 asks for Sage Growing I, level 7 asks for Mint Growing I, and level 8 asks for Mana Tonic Brewing I. These replace repetitive turn-ins and reuse their stable task ids so existing save progress remains compatible.
