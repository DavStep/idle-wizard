# Tutorial

Elara Starbrew teaches through one lesson surface after the first purchase dialog. A small Elara button stays on the left side; pressing it opens the current lesson panel with copy, progress when the step has progress, and a `show me` action for target direction. Press-to-advance steps use the same lesson panel with a border action such as `next` or `continue`; room changes target the real bottom tab so players navigate themselves. Target cues are pointer-only and never add a second guide box. Major first-time concepts also get short checkpoint prompts after completion: first task, first sale, first harvest, first research, and first brew. Level 3 is mostly passive: Elara stays quiet, then shows an attention badge and glow only after idle time, except room-open beats and the first sage grow lesson can open the lesson panel directly before its pointer appears after a short idle pause.

Tutorial logic is unified through `TutorialLogicManager`. `TutorialStepManager` chooses and normalizes the current step, step definitions own reveal tokens and effects, `TutorialReminderManager` owns timing, and `TutorialLogicManager` returns the single view state the facade renders. Keep new tutorial flow rules in that path instead of branching directly inside `TutorialFacade`.

The guide covers a free level 1 seed task and level-up, level 2 Market selling with normal fast-sell rules, level 3 Research and mint seed requirements, level 4 Garden herb requirements, and level 5 Brewing with mana tonic research. It has no skip state.

The first tutorial fast-sell sequence selects the item, boinks the amount value for two seconds without opening the lesson panel or showing a pointer, then automatically advances to the `sell` button. Do not add a manual skip or a second hint box for that amount beat.

When later level-up coin goals already have the fast-sell popup open and an item selected, Elara points at `sell` if the current amount covers the missing coin, or at `+1` if the amount can still usefully increase. The popup amount resets to `1` on open so the first sell read stays clear.

Level-up coin guidance must read Market `shop.shelf.sellItems` quantities before pointing at fast sell. Raw inventory can include items reserved by Garden, Brewing, or listings; if the matching fast-sell row would show `x0`, guide back to the next source instead of the disabled row. If a sellable item exists on another fast-sell type tab, point to that tab before pointing to the item row.

The target cue keeps the same diagonal placement math and uses the Spine pointer on a pointer-local Pixi canvas. Rotate the Spine shell by placement so the authored upward tap points at the target anchor.

Lesson 4 starts by opening the level 4 requirements when herb tasks are visible, then sends players to Garden for the first sage grow using the live sage-herb requirement target, so they see why the summon/plant loop matters. The lesson panel opens immediately, but target pointer help waits for the 2-second gardening idle window or an explicit `show me` press. The gardening lesson fills the visible sage herb task before circling to mint herb. Later herb objectives use the same delayed target pointer behavior, then point only when the player appears stuck.

Tutorial market steps use the normal direct fast-sell path and live sell quantities. Do not add FTUE-only coin grants, tutorial price overrides, or tutorial-owned inventory mutation; level 1 is free, and level 2 teaches systemic selling.

Players already past level 5 auto-complete the tutorial. Earlier snapshots that already show later progress skip stale lessons.
