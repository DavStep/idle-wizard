# Tutorial

Elara Starbrew teaches through one lesson surface after the first purchase dialog. A small Elara button stays on the left side; pressing it opens the current lesson panel with copy, progress when the step has progress, and a `show me` action for target direction. Press-to-advance steps use the same lesson panel with a border action such as `next` or `open garden`. Target cues are pointer-only and never add a second guide box. Level 3 is mostly passive: Elara stays quiet, then shows an attention badge and glow only after idle time, except room-open beats and the first sage grow which are shown directly.

Tutorial logic is unified through `TutorialLogicManager`. `TutorialStepManager` chooses and normalizes the current step, step definitions own reveal tokens and effects, `TutorialReminderManager` owns timing, and `TutorialLogicManager` returns the single view state the facade renders. Keep new tutorial flow rules in that path instead of branching directly inside `TutorialFacade`.

The guide covers level 1 seed task, tutorial market sale, level 1 level-up, level 2 Garden sage herb and sage seed tasks, level 3 seed research, level 4 Brewing recipe research, and a passive level 5 settings/theme reminder. It has no skip state.

When later level-up coin goals already have the fast-sell popup open and an item selected, Elara points at `sell` if the current amount covers the missing coin, or at `+1` if the amount can still usefully increase. The popup amount resets to `1` on open so the first sell read stays clear.

Level-up coin guidance must read Market `shop.shelf.sellItems` quantities before pointing at fast sell. Raw inventory can include items reserved by Garden, Brewing, or listings; if the matching fast-sell row would show `x0`, guide back to the next source instead of the disabled row. If a sellable item exists on another fast-sell type tab, point to that tab before pointing to the item row.

The target cue keeps the same diagonal placement math and uses the Spine pointer on a pointer-local Pixi canvas. Rotate the Spine shell by placement so the authored upward tap points at the target anchor.

Lesson 3 starts by opening the level 3 requirements when both sage and sage seed tasks are visible, then sends players to Garden for the first sage grow at `0/3`, so they see why the summon/plant loop matters. The level 2 gardening lesson fills the visible sage herb task before circling back to the sage seed task. After that first grow, later sage objectives go back to plain objectives first and delay target pointer help for a short idle window, then point only when the player appears stuck.

Tutorial-owned market pricing stays active until FTUE finishes. Fast sell uses fixed tutorial quotes and local coin/item mutations instead of the live NPC market backend, so tutorial goals do not depend on shared market pressure or offline quotes. Passive market rows may also show tutorial fallback prices when live backend prices are missing.

Players already past level 5 auto-complete the tutorial. Earlier snapshots that already show later progress skip stale lessons.
