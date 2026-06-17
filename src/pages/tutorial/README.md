# Tutorial

Elara Starbrew teaches through one lesson surface. A small Elara button stays on the left side; pressing it opens the current lesson panel with copy, progress when the step has progress, and a `show me` action for target direction. Press-to-advance steps use the same lesson panel with a `next` border action. Target cues are pointer-only and never add a second guide box. Level 3 uses passive guidance: Elara stays quiet, then shows an attention badge and glow only after idle time.

Tutorial logic is unified through `TutorialLogicManager`. `TutorialStepManager` chooses and normalizes the current step, step definitions own reveal tokens and effects, `TutorialReminderManager` owns timing, and `TutorialLogicManager` returns the single view state the facade renders. Keep new tutorial flow rules in that path instead of branching directly inside `TutorialFacade`.

The guide covers level 1 seed task, tutorial market sale, level 1 level-up, level 2 Garden sage seed and sage herb tasks, level 3 seed research, and level 4 Brewing recipe research. It has no skip state.

Lesson 3 sage objectives open as plain objectives first. They delay target pointer help for a short idle window, then point only when the player appears stuck, such as having no active sage crop and not summoning a seed.

The level 1 market lesson is the only tutorial-only gameplay effect: after the player selects sage seed in fast sell, the tutorial locally sells one sage seed for fixed tutorial gold. It updates real local inventory/gold and save data, but it does not call the NPC market backend or change normal market pricing/demand.

Players already past level 4 auto-complete the tutorial. Earlier snapshots that already show later progress skip stale lessons.
