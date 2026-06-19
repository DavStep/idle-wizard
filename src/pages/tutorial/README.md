# Tutorial

Elara Starbrew teaches through one lesson surface. A small Elara button stays on the left side; pressing it opens the current lesson panel with copy, progress when the step has progress, and a `show me` action for target direction. Press-to-advance steps use the same lesson panel with a `next` border action. Target cues are pointer-only and never add a second guide box. Level 3 is mostly passive: Elara stays quiet, then shows an attention badge and glow only after idle time, except the first sage grow which is shown directly.

Tutorial logic is unified through `TutorialLogicManager`. `TutorialStepManager` chooses and normalizes the current step, step definitions own reveal tokens and effects, `TutorialReminderManager` owns timing, and `TutorialLogicManager` returns the single view state the facade renders. Keep new tutorial flow rules in that path instead of branching directly inside `TutorialFacade`.

The guide covers level 1 seed task, tutorial market sale, level 1 level-up, level 2 Garden sage herb and sage seed tasks, level 3 seed research, level 4 Brewing recipe research, and a passive level 5 settings/theme reminder. It has no skip state.

When later level-up gold goals already have the fast-sell popup open and an item selected, Elara switches to copy-only amount guidance instead of a pointer cue. The popup amount resets to `1` on open so the first sell read stays clear.

The target cue keeps the same diagonal placement math and uses the Spine pointer on a pointer-local Pixi canvas. Rotate the Spine shell by placement so the authored upward tap points at the target anchor.

Lesson 3 starts by showing the first sage grow directly at `0/3`, so players see the summon/plant loop once. The level 2 gardening lesson fills the visible sage herb task before circling back to the sage seed task. After that first grow, later sage objectives go back to plain objectives first and delay target pointer help for a short idle window, then point only when the player appears stuck.

Tutorial-owned market pricing stays active until FTUE finishes. Fast sell uses fixed tutorial quotes and local gold/item mutations instead of the live NPC market backend, so tutorial goals do not depend on shared market pressure or offline quotes. Passive market rows may also show tutorial fallback prices when live backend prices are missing.

Players already past level 5 auto-complete the tutorial. Earlier snapshots that already show later progress skip stale lessons.
