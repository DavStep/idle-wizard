# Tutorial

Elara Starbrew teaches through one lesson surface. A small Elara button stays on the left side; pressing it opens the current lesson panel with copy, progress when the step has progress, and a `show me` action for target direction. Press-to-advance steps use the same lesson panel with a `next` border action. Target cues are pointer-only and never add a second guide box. Level 3 is mostly passive: Elara stays quiet, then shows an attention badge and glow only after idle time, except the first sage grow which is shown directly.

Tutorial logic is unified through `TutorialLogicManager`. `TutorialStepManager` chooses and normalizes the current step, step definitions own reveal tokens and effects, `TutorialReminderManager` owns timing, and `TutorialLogicManager` returns the single view state the facade renders. Keep new tutorial flow rules in that path instead of branching directly inside `TutorialFacade`.

The guide covers level 1 seed task, tutorial market sale, level 1 level-up, level 2 Garden sage seed and sage herb tasks, level 3 seed research, and level 4 Brewing recipe research. It has no skip state.

The target cue keeps the same diagonal placement math and uses the plain pointing-hand asset, with the small source-scale nudge animation handled in CSS.

Lesson 3 starts by showing the first sage grow directly at `0/3`, so players see the summon/plant loop once. After that first grow, later sage objectives go back to plain objectives first and delay target pointer help for a short idle window, then point only when the player appears stuck.

The level 1 market lesson is the only tutorial-only gameplay effect: after the player selects sage seed in fast sell and presses `sell`, the tutorial locally sells one sage seed for fixed tutorial gold. It updates real local inventory/gold and save data, but it does not call the NPC market backend or change normal market pricing/demand.

Players already past level 4 auto-complete the tutorial. Earlier snapshots that already show later progress skip stale lessons.
