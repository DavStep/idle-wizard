# Tasks

Tasks turn item drops into player level progress. In the Workshop UI, players see them as `level N requirements`, where N is the level they are trying to reach.

Each level gets its task list from SpacetimeDB `game_config.tasks`. Turning in a requirement consumes the submitted items until its required quantity is full, then the filled requirement can be completed. Completing every requirement in the current level makes the level ready, but the player level advances only after paying the level completion coin cost.

The current balance curve defines tasks through level 100. Levels 1-10 are hand-authored for onboarding: level 1 is a free sage seed turn-in, level 2 teaches normal Market selling, level 3 introduces Research and mint seed, level 4 introduces herb requirements, and level 5 introduces mana tonic. Levels 6-10 widen into nettle, lavender, briar, glowcap, and the first potion chain. Config levels 11-100 use one seed, two herbs, and two potions, with local ten-level stage bosses at 20/30/40/.../100 and relief rows immediately after each boss. Item quantities stay easy through level 30, easy-medium through 40, medium through 60, medium-hard through 89, and hard from 90-100. From target level 6 onward, adjacent levels should not reuse exact requirement items; direct herb quantities stay lighter while potion quantities carry more of the grind.
